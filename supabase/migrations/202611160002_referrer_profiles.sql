-- Add admin-managed referrers before verified-email account linking.
begin;
create table public.referrer_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  email text not null unique check (email = lower(btrim(email)) and length(email) between 3 and 254),
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'),
  enabled boolean not null default true,
  user_id uuid unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.referrer_profiles enable row level security;
revoke all on public.referrer_profiles from public, anon, authenticated;
grant select, insert, update, delete on public.referrer_profiles to service_role;
commit;
