-- Combined merchandise discounts + free shipping. Apply before testing the new UI.
-- Existing promo codes default to false; historical orders are not rewritten.
-- Existing quote and order-validation functions keep their names, permissions and trigger.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15s';

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS includes_free_shipping boolean NOT NULL DEFAULT false;

ALTER TABLE public.promo_codes
  DROP CONSTRAINT promo_codes_eligible_shipping_method_valid,
  ADD CONSTRAINT promo_codes_eligible_shipping_method_valid CHECK (
    eligible_shipping_method IS NULL
    OR ((discount_type = 'free_shipping' OR includes_free_shipping)
        AND length(btrim(eligible_shipping_method)) > 0)
  );

-- Permit both benefits while bounding each to its own part of the order.
ALTER TABLE public.orders
  DROP CONSTRAINT orders_discount_amount_valid,
  ADD CONSTRAINT orders_discount_amount_valid CHECK (
    (promo_code IS NULL AND discount_amount = 0 AND shipping_discount_amount = 0)
    OR (promo_code IS NOT NULL AND subtotal IS NOT NULL
        AND discount_amount >= 0 AND discount_amount <= subtotal
        AND shipping_discount_amount >= 0
        AND (discount_amount > 0 OR shipping_discount_amount > 0)
        AND (shipping_discount_amount = 0
          OR (shipping_price IS NOT NULL AND shipping_discount_amount = shipping_price)))
  );

CREATE OR REPLACE FUNCTION public.quote_promo_code(p_code text, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  promotion public.promo_codes%ROWTYPE;
  quoted_subtotal numeric;
  quoted_discount numeric;
  matched_lines integer;
  distinct_products integer;
  line_count integer;
BEGIN
  IF p_code IS NULL OR length(p_code) > 64 THEN
    RAISE EXCEPTION 'Enter a valid promo code.';
  END IF;

  SELECT * INTO promotion
  FROM public.promo_codes
  WHERE code = upper(btrim(p_code));

  IF NOT FOUND OR NOT promotion.enabled
     OR (promotion.starts_at IS NOT NULL AND now() < promotion.starts_at)
     OR (promotion.ends_at IS NOT NULL AND now() >= promotion.ends_at) THEN
    RAISE EXCEPTION 'This promo code is unavailable.';
  END IF;

  IF promotion.max_uses IS NOT NULL AND promotion.uses >= promotion.max_uses THEN
    RAISE EXCEPTION 'This promo code has reached its usage limit.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Choose items before applying a promo code.';
  END IF;

  line_count := jsonb_array_length(p_items);
  IF line_count NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'This cart cannot use a promo code.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item(line)
    WHERE jsonb_typeof(line) IS DISTINCT FROM 'object'
       OR jsonb_typeof(line->'product_code') IS DISTINCT FROM 'string'
       OR jsonb_typeof(line->'quantity') IS DISTINCT FROM 'number'
       OR coalesce(line->>'quantity', '') !~ '^[1-9][0-9]{0,3}$'
  ) THEN
    RAISE EXCEPTION 'One or more cart items have an invalid quantity or product code.';
  END IF;

  SELECT count(*), count(DISTINCT variant.product_code),
         round(sum(variant.price_zone1 * (line->>'quantity')::integer), 2)
  INTO matched_lines, distinct_products, quoted_subtotal
  FROM jsonb_array_elements(p_items) AS item(line)
  JOIN public.product_variants AS variant ON variant.product_code = line->>'product_code'
  JOIN public.products AS product ON product.id = variant.product_id
  WHERE variant.active IS TRUE AND product.active IS TRUE
    AND variant.price_zone1 BETWEEN 0 AND 99999999
    AND variant.stock_quantity >= (line->>'quantity')::integer;

  IF matched_lines <> line_count OR distinct_products <> line_count THEN
    RAISE EXCEPTION 'Refresh your cart. A product or quantity is no longer available.';
  END IF;

  IF quoted_subtotal < promotion.minimum_subtotal THEN
    RAISE EXCEPTION 'This code requires a merchandise subtotal of at least $%.',
      promotion.minimum_subtotal;
  END IF;

  quoted_discount := CASE promotion.discount_type
    WHEN 'fixed' THEN least(promotion.fixed_amount, quoted_subtotal)
    WHEN 'free_shipping' THEN 0
    ELSE round(quoted_subtotal * promotion.percent_off / 100, 2)
  END;

  IF (quoted_discount <= 0 AND promotion.discount_type <> 'free_shipping')
     OR quoted_discount > 9999999999.99 THEN
    RAISE EXCEPTION 'This cart cannot use a promo code.';
  END IF;

  RETURN jsonb_build_object(
    'code', promotion.code,
    'subtotal', quoted_subtotal,
    'discount_type', promotion.discount_type,
    'includes_free_shipping', promotion.discount_type = 'free_shipping' OR promotion.includes_free_shipping,
    'eligible_shipping_method', promotion.eligible_shipping_method,
    'discount_amount', quoted_discount
  );
END;
$fn$;


CREATE OR REPLACE FUNCTION public.enforce_order_promo_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  quote jsonb;
  shipping_amount numeric;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.promo_code IS DISTINCT FROM OLD.promo_code
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
       OR NEW.shipping_discount_amount IS DISTINCT FROM OLD.shipping_discount_amount THEN
      RAISE EXCEPTION 'An order discount cannot be changed after checkout.';
    END IF;

    IF OLD.promo_code IS NOT NULL THEN
      IF NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.items IS DISTINCT FROM OLD.items THEN
        RAISE EXCEPTION 'Discounted merchandise cannot be changed after checkout.';
      END IF;
      IF OLD.shipping_discount_amount > 0
         AND (NEW.shipping_price IS DISTINCT FROM OLD.shipping_price
              OR NEW.shipping_method IS DISTINCT FROM OLD.shipping_method) THEN
        RAISE EXCEPTION 'The shipping method cannot be changed on a free-shipping promo order.';
      END IF;
      NEW.total := OLD.subtotal - OLD.discount_amount
        + coalesce(NEW.shipping_price, 0) - OLD.shipping_discount_amount;
    END IF;
    RETURN NEW;
  END IF;

  NEW.promo_code := nullif(upper(btrim(NEW.promo_code)), '');
  IF NEW.promo_code IS NULL THEN
    NEW.discount_amount := 0;
    NEW.shipping_discount_amount := 0;
    RETURN NEW;
  END IF;

  -- Serialize redemptions of the same code. The counter and order share a
  -- transaction, so a failed insert cannot consume a use.
  PERFORM 1 FROM public.promo_codes WHERE code = NEW.promo_code FOR UPDATE;
  quote := public.quote_promo_code(NEW.promo_code, NEW.items);

  IF round(NEW.subtotal, 2) IS DISTINCT FROM (quote->>'subtotal')::numeric
     OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements(NEW.items) AS item(line)
       JOIN public.product_variants AS variant ON variant.product_code = line->>'product_code'
       WHERE CASE
         WHEN jsonb_typeof(line->'price') = 'number'
         THEN (line->>'price')::numeric IS DISTINCT FROM variant.price_zone1
         ELSE true
       END
     ) THEN
    RAISE EXCEPTION 'A product price changed. Refresh your cart before checking out.';
  END IF;

  SELECT price INTO shipping_amount
  FROM public.shipping_methods
  WHERE name = NEW.shipping_method AND enabled IS TRUE;

  IF NOT FOUND OR shipping_amount IS NULL OR NEW.shipping_price IS DISTINCT FROM shipping_amount THEN
    RAISE EXCEPTION 'Refresh your shipping selection before checking out.';
  END IF;

  IF (quote->>'includes_free_shipping')::boolean THEN
    IF quote->>'eligible_shipping_method' IS NOT NULL
       AND NEW.shipping_method IS DISTINCT FROM (quote->>'eligible_shipping_method') THEN
      RAISE EXCEPTION 'This promo code does not cover the selected shipping method.';
    END IF;
    IF shipping_amount <= 0 THEN
      RAISE EXCEPTION 'Select a paid shipping method to use this free-shipping code.';
    END IF;
    IF NEW.shipping_discount_amount IS DISTINCT FROM shipping_amount THEN
      RAISE EXCEPTION 'Refresh checkout and apply the free-shipping code again.';
    END IF;
  END IF;

  NEW.shipping_discount_amount := CASE
    WHEN (quote->>'includes_free_shipping')::boolean THEN shipping_amount ELSE 0
  END;
  NEW.subtotal := (quote->>'subtotal')::numeric;
  NEW.discount_amount := (quote->>'discount_amount')::numeric;
  NEW.total := NEW.subtotal - NEW.discount_amount + shipping_amount - NEW.shipping_discount_amount;

  UPDATE public.promo_codes SET uses = uses + 1 WHERE code = NEW.promo_code;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.quote_promo_code(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_promo_code(text, jsonb) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_order_promo_code() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
