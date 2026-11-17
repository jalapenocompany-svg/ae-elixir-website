-- Referral credit redemptions cannot generate another referral reward.
-- Adds a guard on referral credit rows only; checkout and inventory triggers are unchanged.
begin;
set local lock_timeout = '5s';

create or replace function public.prevent_referral_credit_reearning()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.orders o
    join public.referral_credit_vouchers v on v.promo_code = o.promo_code
    where o.id = new.order_id
  ) then
    new.amount_cents := 0;
    new.active := false;
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_referral_credit_reearning() from public, anon, authenticated;
drop trigger if exists prevent_referral_credit_reearning on public.referral_order_credits;
create trigger prevent_referral_credit_reearning
before insert or update on public.referral_order_credits
for each row execute function public.prevent_referral_credit_reearning();

commit;
