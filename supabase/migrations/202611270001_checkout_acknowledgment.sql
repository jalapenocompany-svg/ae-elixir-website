-- Add a versioned, server-timestamped acknowledgment record. No existing orders are rewritten.
-- Null is allowed for older clients during staged rollout.
begin;
set local lock_timeout='5s';
alter table public.orders add column if not exists checkout_acknowledgment jsonb;
create or replace function public.record_checkout_acknowledgment()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if new.checkout_acknowledgment is distinct from old.checkout_acknowledgment then
      raise exception 'Checkout acknowledgments cannot be changed after placement.';
    end if;
    return new;
  end if;
  if new.checkout_acknowledgment is null then return new; end if;
  if new.checkout_acknowledgment->>'version' is distinct from '2026-11-27-v1'
    or new.checkout_acknowledgment->'payment' is distinct from 'true'::jsonb
    or new.checkout_acknowledgment->'supplies' is distinct from 'true'::jsonb
    or new.checkout_acknowledgment->'eligibility' is distinct from 'true'::jsonb then
    raise exception 'Confirm all checkout acknowledgments before placing your order.';
  end if;
  new.checkout_acknowledgment := jsonb_build_object(
    'version','2026-11-27-v1','payment',true,'supplies',true,'eligibility',true,
    'accepted_at',clock_timestamp(),'statements','["I understand that placing this order does not complete payment. I must follow the payment instructions sent by email and complete payment within 48 hours, or my unpaid order will be automatically canceled.","I have reviewed the product and research information available on this website. Products are not sold as kits: bacteriostatic (BAC) water and syringes are not included and must be purchased separately if required.","I confirm that I am at least 18 years old and agree to the Terms of Use / Legal Disclaimer and Research Compliance Policy."]'::jsonb);
  return new;
end; $$;
drop trigger if exists record_checkout_acknowledgment on public.orders;
create trigger record_checkout_acknowledgment before insert or update on public.orders
for each row execute function public.record_checkout_acknowledgment();
commit;
