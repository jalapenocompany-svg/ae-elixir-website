# TikTok contact link setup

1. In Supabase SQL Editor, run supabase/migrations/202611230001_add_tiktok_profile_url.sql.
   This adds a nullable TikTok setting only. It preserves existing settings and changes no orders, inventory, payments or referral rules. It can be rerun.
2. Test this branch locally or use its Vercel preview.
3. Open Master Admin → Settings. Instagram URL stays as it is. Add the full TikTok profile URL to TikTok URL, for example https://www.tiktok.com/@yourname.
4. Save settings. Check both the footer and slide-out menu's Contact Us icons.
5. Verify the existing Instagram, WhatsApp and email links still work. Blank TikTok hides its icon.
6. After review, merge the PR into main to deploy. No new environment variables are required.

Implementation: the legacy tiktok_url column already contains Instagram URLs, so it remains unchanged. The new tiktok_profile_url column stores TikTok. The shared ContactLinks component keeps footer/menu appearance and accessibility consistent. Public settings readers fall back to legacy columns if the new column is not installed yet, so existing header/footer content can still load.
