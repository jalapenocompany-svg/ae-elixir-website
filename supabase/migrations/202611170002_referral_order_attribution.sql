-- Record referral attribution in the same transaction as checkout.
begin;

alter table public.orders add column referral_code text;

create table public.referral_order_attributions (
  order_id uuid primary key references public.orders(id) on delete cascade,
  referrer_id uuid not null references public.referrer_profiles(id) on delete restrict,
  code text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create index referral_order_attributions_referrer_id_idx
  on public.referral_order_attributions(referrer_id);

alter table public.referral_order_attributions enable row level security;
revoke all on public.referral_order_attributions from public, anon, authenticated;
grant select on public.referral_order_attributions to service_role;

create function public.record_referral_order_attribution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.referral_order_attributions (order_id, referrer_id, code, display_name)
  select new.id, p.id, p.code, p.display_name
  from public.referrer_profiles p
  where p.code = upper(btrim(new.referral_code))
    and p.enabled
    and p.email <> lower(btrim(coalesce(new.customer_email, '')));
  return new;
end;
$$;

revoke all on function public.record_referral_order_attribution() from public, anon, authenticated;

create trigger record_referral_order_attribution
after insert on public.orders
for each row when (new.referral_code is not null)
execute function public.record_referral_order_attribution();

create function public.referral_sales_overview()
returns jsonb
language sql stable
set search_path = ''
as $$
  with months as (
    select generate_series(
      date_trunc('month', now() at time zone 'America/New_York') - interval '4 months',
      date_trunc('month', now() at time zone 'America/New_York'),
      interval '1 month'
    ) as month_start
  ), paid_orders as (
    select o.created_at, o.total
    from public.referral_order_attributions a
    join public.orders o on o.id = a.order_id
    where o.payment_status = 'paid'
      and coalesce(o.order_status, '') not ilike 'cancel%'
  ), monthly_sales as (
    select m.month_start, coalesce(sum(p.total), 0) as total
    from months m
    left join paid_orders p
      on p.created_at >= (m.month_start at time zone 'America/New_York')
      and p.created_at < ((m.month_start + interval '1 month') at time zone 'America/New_York')
    group by m.month_start
  )
  select jsonb_build_object(
    'paidOrders', (select count(*) from paid_orders),
    'months', (select jsonb_agg(jsonb_build_object(
      'month', to_char(month_start, 'YYYY-MM'), 'total', total
    ) order by month_start) from monthly_sales)
  );
$$;

revoke all on function public.referral_sales_overview() from public, anon, authenticated;
grant execute on function public.referral_sales_overview() to service_role;

commit;
