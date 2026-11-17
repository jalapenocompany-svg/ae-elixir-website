-- Extend the referral sales report to twelve months for the desktop chart.
begin;
create or replace function public.referral_sales_overview()
returns jsonb
language sql stable
set search_path = ''
as $$
  with months as (
    select generate_series(
      date_trunc('month', now() at time zone 'America/New_York') - interval '11 months',
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
