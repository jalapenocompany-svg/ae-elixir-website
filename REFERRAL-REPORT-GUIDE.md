# Referral reporting

## Open the report

Sign in to Master Admin, open Referrals, and choose Reports.
The existing overview and referrer cards remain under Overview & referrers.

The report starts with this month through today in Eastern Time.
Choose From, Through, a referrer, and an order status, then press Apply filters.
Choose all time clears both dates; press Apply filters afterward.
Disabled referrers remain available so their previous activity can be reviewed.

## Referred orders

Dates filter when orders were placed, including both selected dates in Eastern Time.
Only paid, noncanceled, nonrefunded orders contribute to paid sales and earned credit.
Pending orders and canceled/refunded orders appear separately.
Order totals include shipping and applied discounts.

The list shows the order ID/date, referrer, payment/order statuses, total, discount/code and active credit earned.
Orders redeeming a referral credit code are marked Referral credit redemption; after migration 009 they earn no new reward.
Ordinary promotional codes can still earn referral rewards.
An order can still count as a paid referral sale while earning zero credit.

## Credit codes

Dates filter when a code was issued. Each row shows its current state:

- Reserved: an unused code, or a code applied to an order that has not been paid.
- Redeemed: applied to a paid order.
- Returned: canceled/returned code whose credit has been released.

Codes are assigned to the referrer who owns the credit. This may differ from a referral link on the order where the code was used.
This view is a current-state register of issued codes, not a historical event ledger. It does not show when each redemption or return occurred.
The period's credit-code totals are not a lifetime available balance. Use the overview/referrer card for available credit.
Do not subtract the two views' date-filtered totals to calculate a balance: they use order placement and code issuance dates respectively.

## Export CSV

Apply the desired filters and click Export CSV. The export includes every matching row, not only the visible page.
Orders and credit codes export separately with the same selected filters and Eastern Time dates.
Exports over 10,000 rows are rejected with a message; narrow the date range or choose one referrer.
Empty results and unapplied filters disable export.

## Install and test

Run supabase/migrations/202611170010_referral_detailed_report.sql in Supabase SQL Editor.
Migration 010 creates one read-only service-role reporting function and grants execution only to service_role.
It changes no orders, inventory, rewards, vouchers, checkout triggers or existing table policies. It can be rerun.
Migration 009 and the previous targeted test-order correction should already be installed.
Without 010, Reports displays a setup message and the existing referral features remain available.

No new environment variables are needed. Existing NEXT_PUBLIC_REFERRALS_ENABLED,
MASTER_ADMIN_PASSWORD and Supabase server settings remain in use.
All report and CSV requests require the signed Master Admin session.

Test the branch locally before merging:

1. Confirm all-time/all-referrers paid sales and earned credit against the overview.
2. For the corrected DXR101 test: if no other orders have changed, paid sales should be $50 across two paid orders, earned credit $30, and redeemed credit $30.
3. Check one referrer, pending and canceled/refunded filters, and a date range with no results.
4. Check both report views on desktop and mobile.
5. Export CSV from each view and confirm totals/rows match the applied filters.
6. Confirm ordinary checkout and the existing referral overview still work.

The application build, isolated SQL calculations/permissions, filter validation and CSV safety were checked during implementation.
Browser rendering could not be checked in the implementation environment because Chromium launch is restricted; complete the desktop/mobile visual check locally.
Supabase and real production records were not queried or changed by the assistant.
