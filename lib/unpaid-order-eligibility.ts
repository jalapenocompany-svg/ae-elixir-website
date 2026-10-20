/**
 * AE Elixir: pure classifier used by the daily unpaid-order automation.
 * No database calls, no email sends, and no writes.
 */
export type UnpaidOrderCheck = {
  id: string;
  created_at: string;
  payment_due_at: string | null;
  payment_reminder_sent_at: string | null;
  payment_status: string | null;
  order_status: string | null;
  inventory_restocked: boolean | null;
  auto_cancelled_at: string | null;
};

export type UnpaidOrderAction =
  | "not_enrolled"
  | "not_eligible"
  | "invalid_dates"
  | "cancel"
  | "remind"
  | "waiting";

export function getUnpaidOrderAction(
  order: UnpaidOrderCheck,
  nowMs: number = Date.now()
): UnpaidOrderAction {
  if (!order.payment_due_at) return "not_enrolled";

  if (
    order.payment_status?.trim().toLowerCase() !== "pending" ||
    order.order_status?.trim().toLowerCase() !== "pending" ||
    order.inventory_restocked === true ||
    order.auto_cancelled_at !== null
  ) {
    return "not_eligible";
  }

  const createdMs = Date.parse(order.created_at);
  const dueMs = Date.parse(order.payment_due_at);
  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(createdMs) ||
    !Number.isFinite(dueMs) ||
    dueMs <= createdMs
  ) {
    return "invalid_dates";
  }

  // A cancelled order should never get a payment reminder. Check this first.
  if (nowMs >= dueMs) return "cancel";

  const oneDayMs = 24 * 60 * 60 * 1000;
  if (
    nowMs >= createdMs + oneDayMs &&
    order.payment_reminder_sent_at === null
  ) {
    return "remind";
  }

  return "waiting";
}
