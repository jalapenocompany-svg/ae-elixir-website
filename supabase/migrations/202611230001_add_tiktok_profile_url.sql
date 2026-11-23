-- Separate TikTok setting; legacy tiktok_url continues to store Instagram.
-- Does not rewrite existing settings, orders, inventory, or payment data.
begin;
set local lock_timeout = '5s';
alter table public.site_settings add column if not exists tiktok_profile_url text;
comment on column public.site_settings.tiktok_profile_url is 'TikTok profile link. The legacy tiktok_url field remains the Instagram URL for compatibility.';
commit;
