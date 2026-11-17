-- Snapshot earning rules for new attributed orders and track their credit.
begin;
set local lock_timeout = '5s';

create table public.referral_order_credits (
  order_id uuid primary key references public.referral_order_attributions(order_id) on delete cascade,
  referrer_id uuid not null references public.referrer_profiles(id) on delete restrict,
  reward_type text not null check (reward_type in ('none', 'percent', 'fixed')),
  reward_value integer not null,
  minimum_order_cents integer not null,
  order_total_cents bigint not null,
  amount_cents bigint not null check (amount_cents >= 0),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referral_order_credits_referrer_id_idx on public.referral_order_credits(referrer_id);
alter table public.referral_order_credits enable row level security;
revoke all on public.referral_order_credits from public, anon, authenticated;
grant select on public.referral_order_credits to service_role;

create function public.capture_referral_order_credit()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  profile public.referrer_profiles%rowtype;
  placed_order public.orders%rowtype;
  total_cents bigint;
  credit_cents bigint := 0;
begin
  select * into strict profile from public.referrer_profiles where id = new.referrer_id;
  select * into strict placed_order from public.orders where id = new.order_id;
  total_cents := greatest(0, round(coalesce(placed_order.total, 0)::numeric * 100)::bigint);

  if total_cents >= profile.minimum_order_cents then
    if profile.reward_type = 'percent' then
      credit_cents := round(total_cents::numeric * profile.reward_value / 10000)::bigint;
    elsif profile.reward_type = 'fixed' then
      credit_cents := profile.reward_value;
    end if;
  end if;

  insert into public.referral_order_credits (
    order_id, referrer_id, reward_type, reward_value, minimum_order_cents,
    order_total_cents, amount_cents, active
  ) values (
    new.order_id, new.referrer_id, profile.reward_type, profile.reward_value, profile.minimum_order_cents,
    total_cents, credit_cents,
    lower(coalesce(placed_order.payment_status, '')) = 'paid'
      and lower(coalesce(placed_order.order_status, '')) not like 'cancel%'
      and lower(coalesce(placed_order.order_status, '')) not like 'refund%'
  );
  return new;
end;
$$;

revoke all on function public.capture_referral_order_credit() from public, anon, authenticated;

create trigger capture_referral_order_credit
after insert on public.referral_order_attributions
for each row execute function public.capture_referral_order_credit();

create function public.update_referral_order_credit_status()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.referral_order_credits
  set active = lower(coalesce(new.payment_status, '')) = 'paid'
      and lower(coalesce(new.order_status, '')) not like 'cancel%'
      and lower(coalesce(new.order_status, '')) not like 'refund%',
    updated_at = now()
  where order_id = new.id;
  return new;
end;
$$;

revoke all on function public.update_referral_order_credit_status() from public, anon, authenticated;

create trigger update_referral_order_credit_status
after update of payment_status, order_status on public.orders
for each row
when (old.payment_status is distinct from new.payment_status or old.order_status is distinct from new.order_status)
execute function public.update_referral_order_credit_status();

create function public.referral_credit_overview()
returns jsonb
language sql stable
set search_path = ''
as $$
  with balances as (
    select referrer_id, sum(amount_cents) as earned_cents
    from public.referral_order_credits
    where active
    group by referrer_id
  )
  select jsonb_build_object(
    'earnedCents', coalesce((select sum(earned_cents) from balances), 0),
    'referrers', coalesce((select jsonb_agg(jsonb_build_object(
      'id', referrer_id, 'earnedCents', earned_cents
    )) from balances), '[]'::jsonb)
  );
$$;

revoke all on function public.referral_credit_overview() from public, anon, authenticated;
grant execute on function public.referral_credit_overview() to service_role;

commit;
