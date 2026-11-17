-- Store earning rules without creating or spending credits.
begin;

alter table public.referrer_profiles
  add column reward_type text not null default 'none',
  add column reward_value integer not null default 0,
  add column minimum_order_cents integer not null default 0,
  add constraint referrer_profiles_reward_rule_check check (
    minimum_order_cents between 0 and 999999999
    and (
      (reward_type = 'none' and reward_value = 0 and minimum_order_cents = 0)
      or (reward_type = 'percent' and reward_value between 1 and 10000)
      or (reward_type = 'fixed' and reward_value between 1 and 999999999)
    )
  );

comment on column public.referrer_profiles.reward_value is
  'Basis points for percentage rewards, USD cents for fixed rewards, zero for none.';

commit;
