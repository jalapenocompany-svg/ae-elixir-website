-- Read-only reporting function. Does not change orders, stock, credits, or checkout.
begin;
create or replace function public.referrer_admin_sales()
returns jsonb
language sql stable
set search_path = ''
as $$
  with totals as (
    select p.id,
      count(o.id) filter (where lower(o.payment_status) = 'paid') as paid,
      count(o.id) filter (where coalesce(lower(o.payment_status), 'pending') in ('pending', 'unpaid', 'processing')) as pending,
      coalesce(sum(o.total) filter (where lower(o.payment_status) = 'paid'), 0) as sales
    from public.referrer_profiles p
    left join public.referral_order_attributions a on a.referrer_id = p.id
    left join public.orders o on o.id = a.order_id
      and coalesce(o.order_status, '') not ilike 'cancel%'
      and coalesce(o.order_status, '') not ilike 'refund%'
    group by p.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'paidOrders', paid, 'pendingOrders', pending, 'salesTotal', sales
  )), '[]'::jsonb) from totals;
$$;
revoke all on function public.referrer_admin_sales() from public, anon, authenticated;
grant execute on function public.referrer_admin_sales() to service_role;
commit;
