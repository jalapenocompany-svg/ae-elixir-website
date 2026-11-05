# Scheduled promotions — review and rollout

Prepared from `main` commit `2402af8e3f9b5af20da254c10f3cdf1bee7d783d` (COA PDF conversion), fetched November 5, 2026. Feature branch: `feature/scheduled-promotions`.

## What changes

HOLIDAY10 gives 10% off the merchandise subtotal of $100 or more. Shipping does not meet the minimum and is never discounted. One promotion per order; no stacking. The code is case insensitive. All currently sold merchandise qualifies. No usage cap or per-customer limit is implied by this release.

The schedule uses America/New_York: November 16, 2026 at 00:00 inclusive through December 1 at 00:00 exclusive (the entire day of November 30). In UTC this is November 16 05:00 through December 1 05:00. PostgreSQL decides whether an order is eligible at insertion, even if a customer leaves checkout open. No cron job or Vercel scheduled task is needed. Banners refresh at schedule transitions and at least every 60 seconds. Cached banners expire locally even during a network outage. Applied-code expiration and banners use the database clock plus elapsed time, so a wrong device clock cannot extend a discount.

The checkout and confirmation show the applied discount. WhatsApp messages, confirmation emails, local recent orders and order lookup include it. Admin email resends load saved promotion totals; admin shipping edits retain the original discount after expiration. Product sales reporting allocates the discount proportionately in cents and subtracts it from revenue and profit.

Existing dynamic payment methods, email recipients, inventory deduction/restocking, tracking, unpaid-order automation, and COA uploads retain their existing paths. New order inserts (with or without a promotion) now check active database products, zone1 prices, quantities, stock, shipping prices and arithmetic in PostgreSQL. Stale carts must be refreshed. No tax changes are included.

## Migration explanation — not applied remotely

`supabase/migrations/202611050001_scheduled_promotions.sql` runs in one transaction and adds:

- `promotions`: code, percent, minimum merchandise subtotal, start/end timestamps, enabled flag, banner and creation date. RLS is enabled. Browser roles cannot read or manage this table directly. SQL editor/service role management only in this release.
- `orders.promotion_code` (nullable text) and `orders.discount_amount` (numeric, default zero). No existing order values, inventory counts, statuses, email markers or payment settings are changed.
- `active_storefront_promotions()` exposes only currently active banners.
- `storefront_promotion_schedule()` exposes active banners, the server clock, and the next schedule transition. Future promotion codes are not exposed.
- `quote_promotion(text,jsonb,text)` calculates current catalog prices and eligibility. A null code returns a zero-discount quote. Only zone1 is supported because that is what the current storefront uses.
- An order insert/update trigger rejects invalid prices/totals and protects saved promotion snapshots. Historical promotion line items/subtotals/discounts are immutable. Customer/status/tracking edits and canonical shipping changes still work; the saved discount is not re-evaluated against today's schedule.
- The scheduled HOLIDAY10 row.

Set `NEXT_PUBLIC_PROMOTIONS_ENABLED=true` in the intended Vercel environment only after its migration is installed. The default is disabled: promotion entry and banners stay hidden. This is a build-time public switch, not a secret or a replacement for database validation; redeploy after changing it. With the migration installed, order inserts are validated even while the UI switch is disabled.

There are no new production dependencies. PGlite and jsdom are development dependencies for reproducible isolated SQL and client tests. The lockfile also repairs two missing optional dependency records required for `npm ci`.

The repository contains no live database schema/migration history. Tests use a disposable PostgreSQL fixture matching the columns the current application reads. This is not proof that the live schema, RLS, other triggers or column constraints match. Run `supabase/promotions-preflight.sql` in the staging SQL editor, inspect the result, and compare required fields/types and existing triggers before applying. Duplicate variant codes or shipping names must be resolved in existing data before rollout. The migration intentionally fails if similarly named objects already exist; do not blindly rerun it or add `IF NOT EXISTS` to hide conflicts.

## Validation already performed

- 15 disposable PostgreSQL checks cover the exact holiday dates, minimum with shipping excluded, valid/invalid schedules, cent rounding, start-inclusive/end-exclusive boundaries, stock/quantity checks, forged direct inserts, public permissions, legacy checkout, saved discounts after expiration, admin shipping edits, invalid quantity types and nonfinite catalog prices.
- TypeScript and production build run with non-secret build placeholders; no Supabase or Resend credentials were provided and no real email/order was sent.
- 12 client/report checks cover quote application, removal, rejected/unapplied codes blocking checkout, stale carts, changed shipping, late responses, expiration, wrong device clocks, banner expiration during an outage and cent allocation.
- Five mocked email-route checks verify saved discount totals, ordinary confirmations and admin resends without sending email.
- New modules are linted separately; existing application lint findings are compared with the unchanged baseline.
- Browser visual QA is unverified: the managed preview service passed Vite flags (`--host` / `--strictPort`) to the existing Next.js dev command, which rejected them. Real browser, Supabase, Resend and Vercel staging checks remain required below. Temporary QA fixtures/configuration were removed and are not part of the deliverable.

To reproduce the database tests without touching a remote database:

```bash
npm ci
npm run test:promotions
npx tsc --noEmit
npm run build
```

For a real local build use `.env.local` with your existing Supabase URL/public key and Resend API key. Set `NEXT_PUBLIC_PROMOTIONS_ENABLED=true` only for a database with the migration installed. Do not commit environment files or share secret values in chat. The tests never use configured remote Supabase or Resend credentials.

## Precise GitHub / Vercel rollout

1. Review the draft pull request and all changed files. Do not merge yet. The branch contains full updated files, not partial snippets.
2. In Vercel, open the existing AE Elixir project → Settings → Environment Variables. For the Preview scope (optionally specific to `feature/scheduled-promotions`), configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for a **separate staging Supabase project** containing the current schema and safe fixture catalog/settings. Preserve other existing server variables used by current routes; point any Supabase service-role key to staging too. Use a staging Resend account/key and controlled test recipients. Set `NEXT_PUBLIC_SITE_URL` to your staging deployment URL. Leave `NEXT_PUBLIC_PROMOTIONS_ENABLED` absent or false until the migration succeeds. An isolated preview website can still modify production data if its variables point to production.
3. Run the read-only preflight against staging. Review the migration explanation above and confirm its types/triggers/policies match the actual schema. Save a database backup before schema changes.
4. Apply the migration to staging using Supabase SQL Editor → New query → paste the **entire migration file** → Run, after verifying the selected project. This repo has no Supabase CLI config or baseline; do not initialize a fresh CLI history and blindly `db push` into an existing project. If you already manage migrations elsewhere, reconcile that history first and apply this migration through that workflow. Record the migration as applied in your existing migration tracking; SQL editor changes alone do not update CLI history.
5. Set `NEXT_PUBLIC_PROMOTIONS_ENABLED=true` for the branch's Preview scope. In Vercel → Deployments, select the feature-branch preview → Redeploy after configuring Preview variables. A Git-connected project normally creates previews on branch/PR pushes. Use its Visit link; this is not the aeelixir.com production deployment.
6. Run every staging check below. Do not use real customer emails or real payments for these tests. Leave HOLIDAY10's real dates unchanged. A separate staging-only code should be used to exercise active/expired conditions.
7. After staging passes, review the production preflight and backup. Apply the exact reviewed migration to production **before** merging the frontend. The old checkout is compatible with the added default-zero discount columns and accepts valid current catalog prices. The banner/function/table migration itself does not deploy website code.
8. After the production migration succeeds, set `NEXT_PUBLIC_PROMOTIONS_ENABLED=true` in Vercel's Production scope. On GitHub, mark the draft PR Ready for review, confirm checks, and merge to `main`. If the existing Vercel project's Production Branch is `main`, its Git integration should build a Production deployment. Verify the deployment commit and Ready status before opening aeelixir.com. If automatic Git deployments are disabled, deploy that reviewed commit from the Vercel project; do not deploy an unrelated local checkout.
9. Verify live storefront loads, ordinary checkout totals, existing payment options, lookup and admin loading. HOLIDAY10 should remain inactive until November 16 ET. Do not change production dates just to preview the banner.

Optional local checkout of the reviewed branch:

```bash
git fetch origin
git switch --track origin/feature/scheduled-promotions
npm ci
npm run build
```

If the branch already exists locally, switch to it and use `git pull --ff-only`. If you have uncommitted changes, preserve them before switching; do not force reset or force push.

## Staging acceptance checks

Create a temporary staging-only promotion in SQL editor:

```sql
insert into public.promotions
  (code, percent_off, minimum_subtotal, starts_at, ends_at, banner_text)
values ('STAGING10', 10, 100, now() - interval '1 minute',
        now() + interval '1 day', 'Staging test: 10% off $100+ with STAGING10');
```

- Desktop and mobile: storefront banner, product selection, cart, quantities and checkout layout.
- No code: finish an ordinary order for each existing payment method with its existing payment instructions and correct shipping. Verify saved order, inventory deduction exactly once, customer/admin email, recent order and lookup.
- $99.99 merchandise plus shipping: code rejected. Exactly $100 merchandise: $10 discount, shipping unchanged. $150 merchandise plus $10 shipping: $15 discount, $145 payable.
- Invalid, disabled, future and expired codes; mixed-case/whitespace; apply/remove; cart/shipping changes after applying; a code expiring while review is open. A rejected or stale quote must not silently submit a discounted order.
- Alter request totals or prices in browser developer tools; database must reject. Send duplicate product codes or quantities exceeding current stock; reject.
- Repeat review and successful submit; verify no unexpected extra inventory mutation. Existing submit/inventory flow has no atomic reservation or idempotency key; this release does not claim to solve that pre-existing concurrency risk.
- Edit a discounted order's customer/contact, payment, shipping, status and tracking in admin after expiring the staging code. Shipping changes preserve its original discount. Attempt to edit saved promotion totals; reject.
- Verify original emails, admin resends, tracking emails and unpaid reminders/cancellations use the saved discounted total. Confirm one stock restock when an order is cancelled under the existing workflow.
- Admin product revenue/profit and CSV export subtract discounts and round allocations to the exact discount amount.
- COA PNG/image upload and single-page PDF-to-image upload still display in the storefront.
- Reload cart/recent orders; verify saved totals and that promo is intentionally re-applied rather than trusted from local storage.

## Managing future promotions

Use SQL editor as the database administrator, using the same fields as the staging example. Set explicit timezone-aware timestamps. Disable with:

```sql
update public.promotions set enabled = false where code = 'HOLIDAY10';
```

Do not delete historical order discount columns or modify saved discounts. Codes are not foreign keys so an administrator can archive promotions without breaking historical orders. An authenticated Master Admin promotions editor is not included: the existing portal uses a client-side password rather than server authentication. New privileged promotion write APIs must not reuse that browser-only check.

## Rollback

To stop new promotion entry, set `NEXT_PUBLIC_PROMOTIONS_ENABLED=false` and redeploy; also disable the campaign in SQL to reject already-open or direct requests. Keep the discount-aware admin/email code and additive schema in place. Before any production discounted orders exist, reverting the PR's frontend commits and redeploying the previous production commit is also possible. After discounted orders exist, **do not revert the admin/email discount-aware code without a forward fix**, as old admin shipping edits can calculate the wrong total. Retain the trigger and stored discount snapshots. Do not drop columns or delete promotion orders to roll back.

## Next priorities

Card processing and customer referrals are not implemented in this branch. Card work starts with a processor that explicitly approves the actual catalog and truthful business disclosure, then hosted checkout, signed webhooks and payment/inventory reconciliation. No approval or compliance conclusion has been assumed. Referral work needs server-authenticated customers/admins, reward rules, a credit ledger, atomic redemption and refund/reversal rules; do not put earned balances in local storage or trust a browser-supplied balance.

Official deployment references: [Vercel environments](https://vercel.com/docs/deployments/environments), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Vercel Git deployments](https://vercel.com/docs/git), [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations).
