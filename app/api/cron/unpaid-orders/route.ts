import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  getUnpaidOrderAction,
  type UnpaidOrderCheck,
  type UnpaidOrderAction,
} from "@/lib/unpaid-order-eligibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 500;
const MAX_PAGES = 100;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length < 32) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * PHASE 4C — READ-ONLY scheduled check. Intentionally does not import Resend
 * or call the database cancellation function, and cannot send or cancel anything.
 */
export async function GET(request: Request) {
  const responseHeaders = { "Cache-Control": "no-store" };
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: responseHeaders });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503, headers: responseHeaders }
    );
  }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const nowMs = Date.now();
  const counts: Record<UnpaidOrderAction, number> = {
    not_enrolled: 0,
    not_eligible: 0,
    invalid_dates: 0,
    cancel: 0,
    remind: 0,
    waiting: 0,
  };
  const examples: Array<{ order: string; wouldDo: UnpaidOrderAction; deadline: string }> = [];
  let reviewed = 0;
  let completed = false;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await client
        .from("orders")
        .select("id,created_at,payment_due_at,payment_reminder_sent_at,payment_status,order_status,inventory_restocked,auto_cancelled_at")
        .not("payment_due_at", "is", null)
        .eq("payment_status", "pending")
        .eq("order_status", "pending")
        .eq("inventory_restocked", false)
        .order("payment_due_at", { ascending: true })
        .order("id", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw new Error(error.message);
      const rows = (data ?? []) as UnpaidOrderCheck[];
      for (const order of rows) {
        const action = getUnpaidOrderAction(order, nowMs);
        counts[action] += 1;
        reviewed += 1;
        if ((action === "cancel" || action === "remind") && examples.length < 10) {
          examples.push({
            order: order.id.slice(0, 8).toUpperCase(),
            wouldDo: action,
            deadline: order.payment_due_at ?? "",
          });
        }
      }

      if (rows.length < PAGE_SIZE) {
        completed = true;
        break;
      }
    }

    // A partial result must never appear to be a completed safety check.
    if (!completed) {
      return Response.json(
        { error: "Read-only scan exceeded 50,000 enrolled orders; no actions taken." },
        { status: 503, headers: responseHeaders }
      );
    }

    // Deterministic sanity checks that exercise the SAME classifier.
    const mock = (createdHoursAgo: number, dueHoursFromNow: number, paid = false): UnpaidOrderCheck => ({
      id: "SIMULATION",
      created_at: new Date(nowMs - createdHoursAgo * 3_600_000).toISOString(),
      payment_due_at: new Date(nowMs + dueHoursFromNow * 3_600_000).toISOString(),
      payment_reminder_sent_at: null,
      payment_status: paid ? "paid" : "pending",
      order_status: "pending",
      inventory_restocked: false,
      auto_cancelled_at: null,
    });
    const simulation = {
      unpaidAfter30Hours: getUnpaidOrderAction(mock(30, 18), nowMs),
      unpaidAfter49Hours: getUnpaidOrderAction(mock(49, -1), nowMs),
      unpaidAfter8Hours: getUnpaidOrderAction(mock(8, 40), nowMs),
      paidAfter49Hours: getUnpaidOrderAction(mock(49, -1, true), nowMs),
    };

    const output = {
      phase: "4C",
      mode: "DRY_RUN_ONLY",
      timestampUtc: new Date(nowMs).toISOString(),
      checkedEnrolledPendingOrders: reviewed,
      wouldSendReminders: counts.remind,
      wouldCancelOrders: counts.cancel,
      awaitingDeadlineOrAlreadyReminded: counts.waiting,
      invalidDateRows: counts.invalid_dates,
      examples,
      simulation,
      noChangesMade: true,
      noEmailsSent: true,
    };
    console.info("AE Elixir unpaid-order cron dry run:", JSON.stringify(output));
    return Response.json(output, { headers: responseHeaders });
  } catch (error) {
    console.error("AE Elixir unpaid-order cron dry-run error:", error);
    return Response.json(
      { error: "Read-only scan failed; no actions taken.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: responseHeaders }
    );
  }
}
