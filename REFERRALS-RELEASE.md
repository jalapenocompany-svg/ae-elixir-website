# Referral production release

This branch preserves the shipping/payment loading fix from main. Stripe integration is not included.

## 1. Configure the password and feature switch before deploying

Vercel → AE Elixir project → Settings → Environment Variables.
Set these for Production and Preview:

| Name | Value |
| --- | --- |
| MASTER_ADMIN_PASSWORD | A new private password of at least 9 characters; this becomes the normal Master Admin login password |
| NEXT_PUBLIC_REFERRALS_ENABLED | true |
| NEXT_PUBLIC_SITE_URL | https://aeelixir.com |

Keep MASTER_ADMIN_PASSWORD private; never prefix it with NEXT_PUBLIC_.
Existing SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ORDER_FROM_EMAIL and Supabase public settings must remain configured.
Use a new password rather than the old password previously embedded in client code.
Add MASTER_ADMIN_PASSWORD and NEXT_PUBLIC_REFERRALS_ENABLED to .env.local for local testing, then restart npm run dev.
The old NEXT_PUBLIC_REFERRALS_PREVIEW_ENABLED setting still works locally.
Public feature flags require a new build/deployment after changing them.

## 2. Add the local email images to this branch

The following files exist on the developer's computer but were absent from GitHub during release preparation:

- public/referral-portal.png
- public/forgot-password.png

Upload them to the public folder on feat/referrer-links-preview before publishing. Check both filenames and letter case.

## 3. Add the read-only admin reporting function

Supabase → SQL Editor → New query.
Open supabase/migrations/202611170008_referrer_admin_sales.sql from this branch, paste its complete contents, and run it once.
The earlier referral migrations 002 through 007 should already be installed from local testing; do not blindly rerun them.

Migration 008 adds one reporting function, available only to the server service role.
It does not update existing orders, inventory, credits, policies on existing tables, or checkout triggers.
It can be rerun safely. Until installed, the new per-referrer sales fields display dashes.
Paid sales are saved order totals, including shipping and applied discounts. Canceled/refunded orders are excluded. Pending orders earn no credit.

## 4. Confirm Supabase Auth settings

Supabase → Authentication → URL Configuration:

- Site URL: https://aeelixir.com
- Redirect URLs: https://aeelixir.com/referrer-portal
- Retain http://localhost:3000/referrer-portal for local testing.
- Add the exact Vercel preview portal URL if testing password-reset emails there.

Keep the custom SMTP settings and the branded Reset Password email template already configured.
Invitation links use the site where the admin sends the invitation; send real invitations from production after launch.
Public registration should remain disabled for the invitation-only program. The portal's server access checks also require an enabled, invited referral profile.

## 5. Test the preview, then merge

After setting Preview variables, redeploy the latest branch deployment in Vercel.
Check:

1. Master Admin accepts the new configured password.
2. Referrals opens without another password; tab switching preserves the signed session.
3. Existing referrers, credits, sales and pending counts load correctly.
4. A referral URL opens the shop and shows the correct Referred by pill.
5. Invitations, password setup, sign-in and Forgot password work.
6. A referrer sees only their own report.
7. Existing shipping/payment options still load on Slow 3G.
8. An agreed test order earns credit only when paid; cancellation reverses the expected balances.
9. Sign out ends referral admin access.

The session lasts eight hours. Sign out and sign in again if it expires.
Testing here uses the live Supabase database. Use clearly identified test profiles/orders and the normal supported cancellation process.

Once the checklist passes and Production variables are set, merge the pull request into main.
Vercel will create the production deployment. Repeat the login, link, shipping and portal checks on https://aeelixir.com.
If release checks fail, roll back the Vercel deployment. The additive reporting function may remain installed.

## Validation performed during preparation

- Production Next.js build and TypeScript check passed using placeholder environment values.
- Signed-session checks cover password validation, tampering, expiry, password rotation, origin validation and cookie flags.
- Reporting SQL tested on an isolated PostgreSQL-compatible database: paid/pending totals, zero-sales profiles, canceled/refunded exclusions, permissions, rerun safety and unchanged order records.
- Dependency lock repaired for missing optional packages; no existing dependency versions upgraded.

Production credentials, real email delivery and live checkout require the preview/live checklist above; build checks do not verify those integrations.
