-- Review docs/scheduled-promotions.md BEFORE running against Supabase.
-- Additive migration; historical orders and inventory are not rewritten.
begin;

do $$
declare missing text;
begin
  select string_agg(r.table_name || '.' || r.column_name, ', ') into missing
  from (values ('orders','items'),('orders','subtotal'),('orders','total'),
    ('orders','shipping_method'),('orders','shipping_price'),
    ('product_variants','product_code'),('product_variants','product_id'),
    ('product_variants','price_zone1'),('product_variants','stock_quantity'),('product_variants','active'),
    ('products','id'),('products','active'),('shipping_methods','name'),('shipping_methods','price'),('shipping_methods','enabled'))
    r(table_name,column_name)
  where not exists (select 1 from information_schema.columns c where c.table_schema='public'
    and c.table_name=r.table_name and c.column_name=r.column_name);
  if missing is not null then raise exception 'Promotions migration stopped. Missing columns: %',missing; end if;
  if exists (select product_code from public.product_variants group by product_code having count(*) > 1)
    or exists (select name from public.shipping_methods group by name having count(*) > 1) then
    raise exception 'Promotions migration stopped. Product codes and shipping names must be unique.';
  end if;
end;
$$;

create table public.promotions (
  code text primary key check (code = upper(btrim(code)) and code ~ '^[A-Z0-9_-]{3,32}$'),
  percent_off numeric(5,2) not null check (percent_off > 0 and percent_off <= 100),
  minimum_subtotal numeric(12,2) not null default 0 check (minimum_subtotal >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  enabled boolean not null default true,
  banner_text text not null default '' check (length(banner_text) <= 300),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.promotions enable row level security;
-- Management is intentionally restricted to the SQL editor/service role.
revoke all on public.promotions from public, anon, authenticated;
grant all on public.promotions to service_role;

alter table public.orders
  add column promotion_code text,
  add column discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);

create function public.active_storefront_promotions()
returns table (code text, banner_text text, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.code, p.banner_text, p.ends_at from public.promotions p
  where p.enabled and p.starts_at <= statement_timestamp() and statement_timestamp() < p.ends_at
    and p.banner_text <> '' order by p.ends_at, p.code;
$$;

-- Server clock and next transition allow browsers to honor the schedule even
-- when their device clocks are incorrect. No future codes are exposed.
create function public.storefront_promotion_schedule()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'server_now', statement_timestamp(),
    'next_change_at', (select min(t.at) from public.promotions p
      cross join lateral (values(p.starts_at),(p.ends_at)) t(at)
      where p.enabled and p.banner_text <> '' and t.at > statement_timestamp()),
    'promotions', coalesce((select jsonb_agg(to_jsonb(p)) from public.active_storefront_promotions() p), '[]'::jsonb)
  );
$$;

-- PostgreSQL is the pricing authority. No browser subtotal/discount is trusted.
create function public.quote_promotion(p_code text, p_items jsonb, p_shipping_method text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  promo public.promotions%rowtype;
  entry jsonb;
  variant record;
  qty integer;
  subtotal numeric := 0;
  shipping numeric;
  discount numeric;
  seen text[] := '{}';
  normalized text := nullif(upper(btrim(p_code)), '');
begin
  if normalized is not null then
    if normalized !~ '^[A-Z0-9_-]{3,32}$' then raise exception 'Promotion code is not valid.'; end if;
    select * into promo from public.promotions where code = normalized;
    if not found or not promo.enabled then raise exception 'Promotion code is not valid.'; end if;
    if statement_timestamp() < promo.starts_at then raise exception 'This promotion has not started yet.'; end if;
    if statement_timestamp() >= promo.ends_at then raise exception 'This promotion has expired.'; end if;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid cart.'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then raise exception 'Invalid cart size.'; end if;
  for entry in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(entry) <> 'object' or jsonb_typeof(entry->'product_code') <> 'string'
      or coalesce(length(entry->>'product_code'), 0) not between 1 and 80
      or jsonb_typeof(entry->'quantity') <> 'number'
      or coalesce(entry->>'quantity', '') !~ '^[1-9][0-9]{0,3}$' then raise exception 'Invalid item quantity or product.'; end if;
    qty := (entry->>'quantity')::integer;
    if (entry->>'product_code') = any(seen) then raise exception 'Duplicate product in cart.'; end if;
    seen := array_append(seen, entry->>'product_code');
    select v.price_zone1, v.stock_quantity into strict variant
      from public.product_variants v join public.products p on p.id = v.product_id
      where v.product_code = entry->>'product_code' and v.active and p.active;
    if variant.price_zone1 is null or not (variant.price_zone1 >= 0 and variant.price_zone1 < 100000000) then raise exception 'Invalid product price.'; end if;
    if qty > coalesce(variant.stock_quantity, 0) then raise exception 'An item no longer has enough stock. Please update your cart.'; end if;
    -- The current AE Elixir storefront always uses zone1.
    subtotal := subtotal + round(variant.price_zone1::numeric, 2) * qty;
  end loop;
  select s.price into strict shipping from public.shipping_methods s
    where s.name = p_shipping_method and s.enabled;
  if shipping is null or not (shipping >= 0 and shipping < 100000000) then raise exception 'Invalid shipping price.'; end if;
  shipping := round(shipping, 2);
  if normalized is not null and subtotal < promo.minimum_subtotal then
    raise exception 'This promotion requires at least $% in merchandise, excluding shipping.', promo.minimum_subtotal;
  end if;
  discount := round(subtotal * coalesce(promo.percent_off, 0) / 100, 2);
  return jsonb_build_object('code', promo.code, 'subtotal', subtotal,
    'shipping_price', shipping, 'discount_amount', discount,
    'total', subtotal - discount + shipping, 'ends_at', promo.ends_at,
    'server_now', statement_timestamp());
exception when no_data_found or too_many_rows then
  raise exception 'A product or shipping method is unavailable. Please refresh your cart.';
end;
$$;

create function public.enforce_order_promotion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  quote jsonb;
  entry jsonb;
  price numeric;
  shipping numeric;
begin
  if TG_OP = 'UPDATE' then
    -- Preserve earned discounts after expiration; normal status, tracking and
    -- customer edits remain possible. Product/discount snapshots are immutable.
    if old.promotion_code is not null then
      if new.promotion_code is distinct from old.promotion_code
        or new.discount_amount is distinct from old.discount_amount
        or new.subtotal is distinct from old.subtotal
        or new.items::jsonb is distinct from old.items::jsonb then
        raise exception 'Promotion order products and discount cannot be changed.';
      end if;
      if new.shipping_method is distinct from old.shipping_method
        or new.shipping_price is distinct from old.shipping_price then
        select s.price into strict shipping from public.shipping_methods s
          where s.name = new.shipping_method and s.enabled;
        if new.shipping_price is distinct from round(shipping, 2) then raise exception 'Shipping price has changed.'; end if;
      end if;
      if new.total is distinct from round(new.subtotal - old.discount_amount + new.shipping_price, 2) then
        raise exception 'Order total must include the saved promotion discount.';
      end if;
      return new;
    end if;
    if new.promotion_code is not null or new.discount_amount <> 0 then
      raise exception 'Promotions must be applied when placing the order.';
    end if;
    return new;
  end if;

  new.promotion_code := nullif(upper(btrim(new.promotion_code)), '');
  if new.promotion_code is null then
    if new.discount_amount <> 0 then raise exception 'A valid promotion code is required for a discount.'; end if;
  end if;
  quote := public.quote_promotion(new.promotion_code, new.items::jsonb, new.shipping_method);
  if new.subtotal is distinct from (quote->>'subtotal')::numeric
    or new.shipping_price is distinct from (quote->>'shipping_price')::numeric
    or new.discount_amount is distinct from (quote->>'discount_amount')::numeric
    or new.total is distinct from (quote->>'total')::numeric then
    raise exception 'Prices or promotion eligibility changed. Please apply the code again and review your order.';
  end if;
  for entry in select value from jsonb_array_elements(new.items::jsonb) loop
    select v.price_zone1 into strict price from public.product_variants v where v.product_code = entry->>'product_code';
    if (entry->>'price')::numeric is distinct from round(price, 2)
      or (entry->>'line_total')::numeric is distinct from round(price, 2) * (entry->>'quantity')::integer then
      raise exception 'Item prices changed. Please refresh your cart.';
    end if;
  end loop;
  return new;
end;
$$;

create trigger enforce_order_promotion before insert or update on public.orders
  for each row execute function public.enforce_order_promotion();

revoke all on function public.active_storefront_promotions() from public;
revoke all on function public.storefront_promotion_schedule() from public;
revoke all on function public.quote_promotion(text, jsonb, text) from public;
revoke all on function public.enforce_order_promotion() from public;
grant execute on function public.active_storefront_promotions() to anon, authenticated, service_role;
grant execute on function public.storefront_promotion_schedule() to anon, authenticated, service_role;
grant execute on function public.quote_promotion(text, jsonb, text) to anon, authenticated, service_role;

insert into public.promotions (code, percent_off, minimum_subtotal, starts_at, ends_at, banner_text)
values ('HOLIDAY10', 10, 100, '2026-11-16 00:00:00 America/New_York',
  '2026-12-01 00:00:00 America/New_York',
  'Holiday offer: 10% off $100+ in merchandise with HOLIDAY10. Shipping excluded. Ends November 30 (ET).');
notify pgrst, 'reload schema';
commit;
