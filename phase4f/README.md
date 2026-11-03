# AE Elixir — Phase 4F: Countdown display

This phase **only** adds a read-only countdown display to Admin Orders and Order Lookup.
It does not set deadlines, send emails, change payment statuses, cancel orders, or restore inventory.

## Install
1. Extract the ZIP **into the root of the AE Elixir project** (the folder that contains `package.json`).
   You should now have `phase4f/install.mjs` beneath that folder.
2. Open VS Code terminal at the project root.
3. Run: `node phase4f/install.mjs`
4. The script checks all six expected insertion points in the two existing files before writing anything. If any are different, it stops. Ask for a new patch or upload your current files instead of forcing it.
5. Run `npm run build`.
6. Check `git diff` and `git status`. Once satisfied, commit and push only the intended files:
   - `components/UnpaidOrderCountdown.tsx`
   - `app/master-admin/MasterAdminClient.tsx`
   - `app/order-lookup/LookupClient.tsx`
   (The `phase4f` folder can be deleted before `git add .`.)

## Display rules
Countdown appears only if `payment_due_at` is set, `payment_status=pending`, and `order_status=pending`.
It disappears for paid, cancelled, shipped, delivered, and legacy orders not enrolled in automation.
If the 48-hour deadline passes while the cron has not yet run, it says "Deadline reached" and "Awaiting the next scheduled cancellation check" rather than claiming the order was cancelled.
It refreshes its display every 30 seconds and is responsive.

## Safe testing
Enrollment and processing are OFF, so ordinary orders will not show countdowns yet. This is expected.
Do not enable enrollment or cancellation just to see the UI. We can test against an isolated order or a preview component after the build passes.
