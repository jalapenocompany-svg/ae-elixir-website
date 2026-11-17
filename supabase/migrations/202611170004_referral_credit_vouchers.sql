-- Convert earned referral credit into one-use fixed discount codes.
begin;
set local lock_timeout = '5s';

create table public.referral_credit_vouchers (
  id uuid primary key,
  referrer_id uuid not null references public.referrer_profiles(id) on delete restrict,
  promo_code text not null unique references public.promo_codes(code) on delete restrict,
  amount_cents bigint not null check (amount_cents between 1 and 999999999),
  status text not null default 'issued' check (status in ('issued', 'spent', 'released')),
  order_id uuid unique references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index referral_credit_vouchers_referrer_idx on public.referral_credit_vouchers(referrer_id);
alter table public.referral_credit_vouchers enable row level security;
revoke all on public.referral_credit_vouchers from public, anon, authenticated;
grant select on public.referral_credit_vouchers to service_role;

create function public.issue_referral_credit_voucher(
  p_request_id uuid, p_referrer_id uuid, p_amount_cents bigint
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  person public.referrer_profiles%rowtype;
  existing public.referral_credit_vouchers%rowtype;
  earned bigint;
  reserved bigint;
  new_code text;
begin
  if p_request_id is null or p_amount_cents is null or p_amount_cents not between 1 and 999999999 then
    raise exception 'Enter a credit amount of at least $0.01.';
  end if;
  select * into person from public.referrer_profiles where id = p_referrer_id for update;
  if not found then raise exception 'Referrer not found.'; end if;

  select * into existing from public.referral_credit_vouchers where id = p_request_id;
  if found then
    if existing.referrer_id <> p_referrer_id or existing.amount_cents <> p_amount_cents then
      raise exception 'This request has already been used for a different credit amount.';
    end if;
    return to_jsonb(existing);
  end if;
  if not person.enabled then raise exception 'Enable this referrer before creating a code.'; end if;

  select coalesce(sum(amount_cents), 0) into earned
    from public.referral_order_credits where referrer_id = p_referrer_id and active;
  select coalesce(sum(amount_cents), 0) into reserved
    from public.referral_credit_vouchers where referrer_id = p_referrer_id and status <> 'released';
  if p_amount_cents > earned - reserved then raise exception 'This amount exceeds the available referral credit.'; end if;

  new_code := 'RCR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 24));
  insert into public.promo_codes (code, discount_type, percent_off, fixed_amount, minimum_subtotal, enabled, max_uses)
    values (new_code, 'fixed', null, p_amount_cents::numeric / 100, p_amount_cents::numeric / 100, true, 1);
  insert into public.referral_credit_vouchers (id, referrer_id, promo_code, amount_cents)
    values (p_request_id, p_referrer_id, new_code, p_amount_cents)
    returning * into existing;
  return to_jsonb(existing);
end;
$$;
revoke all on function public.issue_referral_credit_voucher(uuid, uuid, bigint) from public, anon, authenticated;
grant execute on function public.issue_referral_credit_voucher(uuid, uuid, bigint) to service_role;

-- This runs after the existing promo validation, within the same insert transaction.
create function public.validate_referral_credit_voucher()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  voucher public.referral_credit_vouchers%rowtype;
  earned bigint;
  reserved bigint;
begin
  select * into voucher from public.referral_credit_vouchers where promo_code = new.promo_code;
  if not found then return new; end if;
  perform 1 from public.referrer_profiles where id = voucher.referrer_id for update;
  if voucher.status <> 'issued' or voucher.order_id is not null then
    raise exception 'This referral credit code has already been used or returned.';
  end if;

  select coalesce(sum(amount_cents), 0) into earned from public.referral_order_credits
    where referrer_id = voucher.referrer_id and active;
  select coalesce(sum(amount_cents), 0) into reserved from public.referral_credit_vouchers
    where referrer_id = voucher.referrer_id and status <> 'released';
  if earned < reserved then raise exception 'This referral credit is unavailable. Contact the store for help.'; end if;
  if new.discount_amount * 100 <> voucher.amount_cents or coalesce(new.shipping_discount_amount, 0) <> 0 then
    raise exception 'This referral credit code has been changed. Contact the store for help.';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_referral_credit_voucher() from public, anon, authenticated;
create trigger validate_referral_credit_voucher before insert on public.orders
for each row when (new.promo_code is not null)
execute function public.validate_referral_credit_voucher();

create function public.record_referral_credit_voucher_order()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.referral_credit_vouchers
    set order_id = new.id, status = case
      when lower(coalesce(new.order_status, '')) like 'cancel%'
        or lower(coalesce(new.order_status, '')) like 'refund%'
        or lower(coalesce(new.payment_status, '')) in ('cancelled', 'canceled', 'refunded')
      then 'released' else 'spent' end
    where promo_code = new.promo_code and status = 'issued';
  if exists (select 1 from public.referral_credit_vouchers where order_id = new.id and status = 'released') then
    update public.promo_codes set enabled = false where code = new.promo_code;
  end if;
  return new;
end;
$$;
revoke all on function public.record_referral_credit_voucher_order() from public, anon, authenticated;
create trigger record_referral_credit_voucher_order after insert on public.orders
for each row when (new.promo_code is not null)
execute function public.record_referral_credit_voucher_order();

create function public.release_referral_credit_voucher()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  voucher public.referral_credit_vouchers%rowtype;
  release_credit boolean;
begin
  perform 1 from public.referrer_profiles p
    where p.id in (
      select referrer_id from public.referral_credit_vouchers where order_id = old.id
      union
      select referrer_id from public.referral_order_credits where order_id = old.id
    )
    order by p.id for update;
  select * into voucher from public.referral_credit_vouchers where order_id = old.id;
  if not found then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  perform 1 from public.referrer_profiles where id = voucher.referrer_id for update;
  release_credit := tg_op = 'DELETE';
  if tg_op = 'UPDATE' then
    release_credit := lower(coalesce(new.order_status, '')) like 'cancel%'
      or lower(coalesce(new.order_status, '')) like 'refund%'
      or lower(coalesce(new.payment_status, '')) in ('cancelled', 'canceled', 'refunded');
  end if;
  update public.referral_credit_vouchers set status = case when release_credit then 'released' else 'spent' end
    where id = voucher.id;
  if release_credit then
    update public.promo_codes set enabled = false where code = voucher.promo_code;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.release_referral_credit_voucher() from public, anon, authenticated;
create trigger release_referral_credit_voucher_update
after update of payment_status, order_status on public.orders
for each row when (old.payment_status is distinct from new.payment_status or old.order_status is distinct from new.order_status)
execute function public.release_referral_credit_voucher();
create trigger release_referral_credit_voucher_delete
before delete on public.orders for each row
execute function public.release_referral_credit_voucher();

create function public.return_referral_credit_voucher(p_voucher_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  voucher public.referral_credit_vouchers%rowtype;
begin
  select * into voucher from public.referral_credit_vouchers where id = p_voucher_id;
  if not found then raise exception 'Credit code not found.'; end if;
  -- Match checkout's promo-then-referrer lock order.
  perform 1 from public.promo_codes where code = voucher.promo_code for update;
  perform 1 from public.referrer_profiles where id = voucher.referrer_id for update;
  select * into voucher from public.referral_credit_vouchers where id = p_voucher_id for update;
  if voucher.status = 'released' then return to_jsonb(voucher); end if;
  if voucher.status <> 'issued' or voucher.order_id is not null then
    raise exception 'Cancel or refund the order to return an applied credit code.';
  end if;
  update public.referral_credit_vouchers set status = 'released' where id = p_voucher_id returning * into voucher;
  update public.promo_codes set enabled = false where code = voucher.promo_code;
  return to_jsonb(voucher);
end;
$$;
revoke all on function public.return_referral_credit_voucher(uuid) from public, anon, authenticated;
grant execute on function public.return_referral_credit_voucher(uuid) to service_role;

create or replace function public.referral_credit_overview()
returns jsonb
language sql stable
set search_path = ''
as $$
  with earned as (
    select referrer_id, sum(amount_cents) as earned_cents
    from public.referral_order_credits where active group by referrer_id
  ), vouchers as (
    select v.referrer_id,
      sum(v.amount_cents) filter (where v.status <> 'released') as committed_cents,
      sum(v.amount_cents) filter (where v.status = 'spent' and lower(o.payment_status) = 'paid') as used_cents
    from public.referral_credit_vouchers v left join public.orders o on o.id = v.order_id
    group by v.referrer_id
  ), balances as (
    select p.id, coalesce(e.earned_cents, 0) as earned_cents,
      coalesce(v.committed_cents, 0) - coalesce(v.used_cents, 0) as reserved_cents,
      coalesce(v.used_cents, 0) as used_cents,
      coalesce(e.earned_cents, 0) - coalesce(v.committed_cents, 0) as available_cents
    from public.referrer_profiles p
    left join earned e on e.referrer_id = p.id
    left join vouchers v on v.referrer_id = p.id
  )
  select jsonb_build_object(
    'earnedCents', coalesce((select sum(earned_cents) from balances), 0),
    'usedCents', coalesce((select sum(used_cents) from balances), 0),
    'referrers', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'earnedCents', earned_cents, 'availableCents', available_cents,
      'reservedCents', reserved_cents, 'usedCents', used_cents
    )) from balances), '[]'::jsonb),
    'vouchers', coalesce((select jsonb_agg(jsonb_build_object(
      'id', v.id, 'referrerId', v.referrer_id, 'code', v.promo_code, 'amountCents', v.amount_cents,
      'status', v.status, 'paid', coalesce(lower(o.payment_status) = 'paid', false)
    ) order by v.created_at desc) from public.referral_credit_vouchers v
      left join public.orders o on o.id = v.order_id), '[]'::jsonb)
  );
$$;

commit;
