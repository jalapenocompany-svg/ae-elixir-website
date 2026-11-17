-- Correct only the redemption order confirmed in the DXR101 diagnostic.
-- Run migration 009 first. No order, inventory or voucher records are changed.
begin;
set local lock_timeout = '5s';

do $$
declare
  target_order constant uuid := '99ade9c0-7013-4eda-ae9a-72c1004a69dc';
  target_referrer uuid;
  earned_after bigint;
  committed bigint;
begin
  if to_regprocedure('public.prevent_referral_credit_reearning()') is null then
    raise exception 'Run migration 202611170009 first.';
  end if;
  select c.referrer_id into target_referrer
  from public.referral_order_credits c
  join public.referrer_profiles p on p.id = c.referrer_id
  join public.orders o on o.id = c.order_id
  join public.referral_credit_vouchers v on v.promo_code = o.promo_code
  where c.order_id = target_order and p.code = 'DXR101'
    and v.referrer_id = p.id;
  if not found then
    raise exception 'The confirmed DXR101 redemption order was not found. No changes made.';
  end if;

  perform 1 from public.referrer_profiles where id = target_referrer for update;
  select coalesce(sum(amount_cents), 0) into earned_after
    from public.referral_order_credits
    where referrer_id = target_referrer and active and order_id <> target_order;
  select coalesce(sum(amount_cents), 0) into committed
    from public.referral_credit_vouchers
    where referrer_id = target_referrer and status <> 'released';
  if committed > earned_after then
    raise exception 'Additional credit codes depend on this reward. No changes made; review those codes first.';
  end if;

  update public.referral_order_credits
    set amount_cents = 0, active = false, updated_at = now()
    where order_id = target_order;
end;
$$;

select p.code, c.order_id, c.amount_cents / 100.0 as corrected_reward,
  c.active as reward_active
from public.referral_order_credits c
join public.referrer_profiles p on p.id = c.referrer_id
where c.order_id = '99ade9c0-7013-4eda-ae9a-72c1004a69dc';

commit;
