-- Read-only admin reporting. No order, inventory, reward or voucher writes.
begin;
create or replace function public.referral_detailed_report(
  p_start date default null, p_end date default null,
  p_referrer uuid default null, p_status text default 'all',
  p_view text default 'orders', p_page integer default 0, p_export boolean default false
)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_status is null or p_status not in ('all','paid','pending','closed')
    or p_view is null or p_view not in ('orders','codes')
    or p_page is null or p_page < 0 or p_page > 100000
    or (p_start is not null and p_end is not null and p_start > p_end) then
    raise exception 'Invalid report filters.';
  end if;
  with order_rows as (
    select o.id, o.created_at, p.id as referrer_id, p.display_name, a.code as referral_code,
      o.total, o.payment_status, o.order_status, o.promo_code,
      coalesce(o.discount_amount,0) as discount_amount,
      case when coalesce(lower(o.order_status),'') like 'cancel%'
        or coalesce(lower(o.order_status),'') like 'refund%'
        or coalesce(lower(o.payment_status),'') in ('cancelled','canceled','refunded')
        then 'closed'
        when lower(o.payment_status) = 'paid' then 'paid' else 'pending' end as category,
      case when c.active then c.amount_cents else 0 end as earned_cents,
      exists (select 1 from public.referral_credit_vouchers v where v.promo_code = o.promo_code) as redeems_credit
    from public.referral_order_attributions a
    join public.referrer_profiles p on p.id = a.referrer_id
    join public.orders o on o.id = a.order_id
    left join public.referral_order_credits c on c.order_id = o.id
    where (p_referrer is null or p.id = p_referrer)
      and (p_start is null or o.created_at >= (p_start::timestamp at time zone 'America/New_York'))
      and (p_end is null or o.created_at < ((p_end + 1)::timestamp at time zone 'America/New_York'))
  ), orders_filtered as (
    select * from order_rows where p_status = 'all' or category = p_status
  ), code_rows as (
    select v.id, v.created_at, p.id as referrer_id, p.display_name, p.code as referral_code,
      v.promo_code, v.amount_cents, v.order_id, o.payment_status, o.order_status,
      case when v.status = 'released' then 'returned'
        when v.status = 'spent' and lower(o.payment_status) = 'paid'
          and coalesce(lower(o.order_status),'') not like 'cancel%'
          and coalesce(lower(o.order_status),'') not like 'refund%' then 'redeemed'
        else 'reserved' end as credit_state
    from public.referral_credit_vouchers v
    join public.referrer_profiles p on p.id = v.referrer_id
    left join public.orders o on o.id = v.order_id
    where (p_referrer is null or p.id = p_referrer)
      and (p_start is null or v.created_at >= (p_start::timestamp at time zone 'America/New_York'))
      and (p_end is null or v.created_at < ((p_end + 1)::timestamp at time zone 'America/New_York'))
  ), rows as (
    select id, created_at, to_jsonb(r) as data from orders_filtered r where p_view = 'orders'
    union all
    select id, created_at, to_jsonb(r) as data from code_rows r where p_view = 'codes'
  ), page_rows as (
    select * from rows order by created_at desc, id desc
    limit (case when p_export then 10000 else 25 end)
    offset (case when p_export then 0 else p_page * 25 end)
  )
  select jsonb_build_object(
    'rowCount', (select count(*) from rows), 'pageSize', 25,
    'summary', jsonb_build_object(
      'paidOrders', (select count(*) from orders_filtered where category = 'paid'),
      'pendingOrders', (select count(*) from orders_filtered where category = 'pending'),
      'closedOrders', (select count(*) from orders_filtered where category = 'closed'),
      'paidSales', (select coalesce(sum(total),0) from orders_filtered where category = 'paid'),
      'earnedCents', (select coalesce(sum(earned_cents),0) from orders_filtered where category = 'paid'),
      'reservedCents', (select coalesce(sum(amount_cents),0) from code_rows where credit_state = 'reserved'),
      'usedCents', (select coalesce(sum(amount_cents),0) from code_rows where credit_state = 'redeemed'),
      'returnedCents', (select coalesce(sum(amount_cents),0) from code_rows where credit_state = 'returned')
    ),
    'rows', coalesce((select jsonb_agg(data order by created_at desc,id desc) from page_rows),'[]'::jsonb)
  ) into result;
  if p_export and (result->>'rowCount')::bigint > 10000 then
    raise exception 'Export exceeds 10,000 rows. Choose a shorter date range or one referrer.';
  end if;
  return result;
end;
$$;
revoke all on function public.referral_detailed_report(date,date,uuid,text,text,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.referral_detailed_report(date,date,uuid,text,text,integer,boolean)
  to service_role;
commit;
