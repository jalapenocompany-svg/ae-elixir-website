# Combined promo codes: local testing before production

One code can now give a percentage or fixed merchandise discount plus free shipping. The minimum is evaluated against merchandise before discounts. One schedule and usage limit cover both benefits. Existing percentage, fixed, shipping-only, and referral credit codes retain their behavior. Merchandise and shipping discounts remain separate in saved orders, checkout, customer email, and CSV reports; sales margins allocate merchandise discounts only.

## 1. Get the test branch

From your existing website folder in VS Code (stop `npm run dev` with Ctrl+C first):

```powershell
git status
git fetch origin
git switch feat/combined-promo-shipping
npm ci
```

If Git reports local changes that prevent switching, stop and keep those changes; do not use force or reset. Keep your existing `.env.local`. No environment variables are added.

## 2. Run the new SQL once

Open `supabase/migrations/202611280001_combined_promo_shipping.sql` from this branch. Copy the entire file into Supabase > SQL Editor > New query, then run it. Expected: Success. No rows returned.

This is a new migration. It adds an `includes_free_shipping` flag defaulting to false, permits both discount fields on one order, and replaces the existing promo quote/validation functions. It does not rewrite historical orders, alter inventory, or change payment/cancellation/referral triggers. It runs in a transaction with short lock/statement timeouts; an error rolls it back. Supabase may warn about `DROP CONSTRAINT`: these replace two named validation rules, not tables or records.

This preserves the old website's behavior for existing codes. Because you share the live DB, do not change an advertised code to a combined offer until the new website version is deployed. Create a separate, unadvertised test code for now.

## 3. Test locally

```powershell
npm run dev
```

1. Open your usual local storefront/admin at `http://localhost:3000`.
2. Promo Codes > New code: use a unique name such as `LOCALCOMBO20`.
3. Choose Percentage off, enter 20, check **Include free shipping**, and select **USPS Standard** (or the actual standard method label in your settings). Choose minimum, schedule and usage limit, then enable/save.
4. Apply it in local checkout. A $100 merchandise subtotal plus $10 standard shipping should show $20 merchandise discount, $10 free shipping, and **$80 total**.
5. Choose faster shipping: a code restricted to standard must ask you to select the eligible method before proceeding. “Any paid shipping method” explicitly covers faster shipping too. No new shipping-discount cap is added.
6. Complete a test order using the usual payment method. Check Review Order, Order Received, customer email, order lookup and admin order totals. Both benefits should be identified. Mark paid only if testing paid-order reports, then verify Sales Performance / Discounts CSV. A code is consumed once per placed order, not once per benefit.
7. Test one fixed-dollar + shipping code and one existing ordinary code. Remove/disable test codes when done; clean up test orders using your existing inventory/credit-safe process.

## Validation included

`npm run test:promotions` runs isolated database and mocked email/admin tests. It never connects to Supabase or sends real emails. Includes existing promo types, combined totals, shipping restrictions, minimums, schedules, usage cap, tampering rejection, saved-order updates, referral vouchers/credit return, and migration reruns/history preservation.

Keep this PR unmerged until local testing is complete. Merging into `main` triggers production deployment. SQL must be applied before new production code is enabled.
