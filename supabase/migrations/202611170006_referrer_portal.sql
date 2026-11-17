-- Give each verified referrer access to their own portal data and credit actions.
begin;

create function public.referrer_portal_profile()
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  login_id uuid := auth.uid();
  login_email text;
  profile_id uuid;
  profile_enabled boolean;
begin
  select lower(btrim(email)) into login_email from auth.users
    where id = login_id and email_confirmed_at is not null;
  if not found then
    raise exception 'Verify your email and sign in to access the referral portal.' using errcode = '42501';
  end if;

  select id, enabled into profile_id, profile_enabled from public.referrer_profiles where user_id = login_id;
  if not found then
    update public.referrer_profiles set user_id = login_id
      where email = login_email and user_id is null and enabled
      returning id, enabled into profile_id, profile_enabled;
    if not found then
      select id, enabled into profile_id, profile_enabled from public.referrer_profiles where user_id = login_id;
    end if;
  end if;
  if profile_id is null or not coalesce(profile_enabled, false) then
    raise exception 'This login does not have an active referral profile. Contact the store for help.' using errcode = '42501';
  end if;
  return profile_id;
end;
$$;
revoke all on function public.referrer_portal_profile() from public, anon, authenticated;

create function public.referrer_portal_overview()
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  profile_id uuid := public.referrer_portal_profile();
  result jsonb;
begin
  with months as (
    select generate_series(
      date_trunc('month', now() at time zone 'America/New_York') - interval '11 months',
      date_trunc('month', now() at time zone 'America/New_York'), interval '1 month'
    ) as month_start
  ), paid_orders as (
    select o.id, o.created_at, o.total, coalesce(c.amount_cents, 0) as credit_cents
    from public.referral_order_attributions a
    join public.orders o on o.id = a.order_id
    left join public.referral_order_credits c on c.order_id = o.id and c.active
    where a.referrer_id = profile_id
      and o.payment_status = 'paid'
      and coalesce(o.order_status, '') not ilike 'cancel%'
      and coalesce(o.order_status, '') not ilike 'refund%'
  ), monthly as (
    select m.month_start, coalesce(sum(p.total), 0) as total
    from months m left join paid_orders p
      on p.created_at >= (m.month_start at time zone 'America/New_York')
      and p.created_at < ((m.month_start + interval '1 month') at time zone 'America/New_York')
    group by m.month_start
  ), earned as (
    select coalesce(sum(amount_cents), 0) as amount from public.referral_order_credits
      where referrer_id = profile_id and active
  ), committed as (
    select coalesce(sum(v.amount_cents) filter (where v.status <> 'released'), 0) as amount,
      coalesce(sum(v.amount_cents) filter (where v.status = 'spent' and lower(o.payment_status) = 'paid'), 0) as used
    from public.referral_credit_vouchers v left join public.orders o on o.id = v.order_id
      where v.referrer_id = profile_id
  )
  select jsonb_build_object(
    'profile', (select jsonb_build_object(
      'name', display_name, 'email', email, 'code', code,
      'rewardType', reward_type, 'rewardValue', reward_value, 'minimumOrderCents', minimum_order_cents
    ) from public.referrer_profiles where id = profile_id),
    'sales', jsonb_build_object(
      'paidOrders', (select count(*) from paid_orders),
      'total', (select coalesce(sum(total), 0) from paid_orders),
      'months', (select jsonb_agg(jsonb_build_object(
        'month', to_char(month_start, 'YYYY-MM'), 'total', total
      ) order by month_start) from monthly)
    ),
    'credits', (select jsonb_build_object(
      'earnedCents', e.amount, 'availableCents', e.amount - c.amount,
      'reservedCents', c.amount - c.used, 'usedCents', c.used
    ) from earned e cross join committed c),
    'vouchers', coalesce((select jsonb_agg(jsonb_build_object(
      'id', v.id, 'code', v.promo_code, 'amountCents', v.amount_cents, 'status', v.status,
      'paid', coalesce(lower(o.payment_status) = 'paid', false), 'createdAt', v.created_at
    ) order by v.created_at desc) from public.referral_credit_vouchers v
      left join public.orders o on o.id = v.order_id where v.referrer_id = profile_id), '[]'::jsonb),
    'recentSales', coalesce((select jsonb_agg(to_jsonb(recent) order by recent."createdAt" desc)
      from (select id, created_at as "createdAt", total, credit_cents as "creditCents"
        from paid_orders order by created_at desc, id desc limit 10) recent), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.referrer_portal_overview() from public, anon, authenticated;
grant execute on function public.referrer_portal_overview() to authenticated;

create function public.issue_my_referral_credit_voucher(p_request_id uuid, p_amount_cents bigint)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  profile_id uuid := public.referrer_portal_profile();
begin
  return public.issue_referral_credit_voucher(p_request_id, profile_id, p_amount_cents);
end;
$$;
revoke all on function public.issue_my_referral_credit_voucher(uuid, bigint) from public, anon, authenticated;
grant execute on function public.issue_my_referral_credit_voucher(uuid, bigint) to authenticated;

create function public.return_my_referral_credit_voucher(p_voucher_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  profile_id uuid := public.referrer_portal_profile();
begin
  if not exists (select 1 from public.referral_credit_vouchers where id = p_voucher_id and referrer_id = profile_id) then
    raise exception 'Credit code not found.' using errcode = '42501';
  end if;
  return public.return_referral_credit_voucher(p_voucher_id);
end;
$$;
revoke all on function public.return_my_referral_credit_voucher(uuid) from public, anon, authenticated;
grant execute on function public.return_my_referral_credit_voucher(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
