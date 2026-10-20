import { timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  getUnpaidOrderAction,
  type UnpaidOrderCheck,
  type UnpaidOrderAction,
} from "@/lib/unpaid-order-eligibility";
import {
  buildAdminAutoCancellationEmail,
  buildCustomerAutoCancellationEmail,
  buildPaymentReminderEmail,
  type EmailContent,
  type UnpaidOrderEmailData,
} from "@/lib/unpaid-order-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 4D.2: scheduler integration with a production activation switch.
 * DEFAULT: READ ONLY. Set UNPAID_ORDER_AUTOMATION_ENABLED=true only after
 * deadline enrollment and a complete go-live test have been approved.
 *
 * Uses the existing Phase 2 atomic cancellation RPC and Phase 4D.1 email
 * claim/mark RPCs; the browser/anon client must never call these functions.
 */
const ACTIVE = process.env.UNPAID_ORDER_AUTOMATION_ENABLED === "true";
const EMAIL_KIND = ["reminder", "customer_cancelled", "admin_cancelled"] as const;
type EmailKind = (typeof EMAIL_KIND)[number];

type OrderRow = UnpaidOrderCheck &
  Omit<UnpaidOrderEmailData, "payment_due_at"> & {
    auto_cancel_customer_emailed_at: string | null;
    auto_cancel_admin_emailed_at: string | null;
  };

const ORDER_COLUMNS = [
  "id", "created_at", "payment_due_at", "payment_reminder_sent_at",
  "payment_status", "order_status", "inventory_restocked", "auto_cancelled_at",
  "auto_cancel_customer_emailed_at", "auto_cancel_admin_emailed_at",
  "customer_name", "customer_email", "total", "payment_method",
].join(",");

// Limit one run to avoid long-lived functions when the storefront grows.
// Unprocessed rows remain eligible on the following daily check.
const MAX_REMINDERS_PER_RUN = 12;
const MAX_CANCELLATIONS_PER_RUN = 12;
const MAX_NOTIFICATIONS_PER_RUN = 30;
const SCAN_LIMIT = 500;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length < 32) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function validEmail(value: string | null | undefined): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value ?? "").trim());
}

function asEmailOrder(order: OrderRow): UnpaidOrderEmailData {
  if (!order.payment_due_at || Number.isNaN(Date.parse(order.payment_due_at))) {
    throw new Error("Order is missing a valid payment deadline.");
  }
  return {
    id: order.id,
    customer_name: order.customer_name,
    customer_email: order.customer_email,
    total: order.total,
    payment_method: order.payment_method,
    payment_due_at: order.payment_due_at,
  };
}

function emailTemplate(kind: EmailKind, order: OrderRow, siteUrl: string): EmailContent {
  const safe = asEmailOrder(order);
  if (kind === "reminder") return buildPaymentReminderEmail(safe, siteUrl);
  if (kind === "customer_cancelled") return buildCustomerAutoCancellationEmail(safe, siteUrl);
  return buildAdminAutoCancellationEmail(safe, siteUrl);
}

/** Safely obtain a claim, submit the email, then mark the job delivered-to-Resend. */
async function sendOne(
  client: SupabaseClient,
  resend: Resend,
  order: OrderRow,
  kind: EmailKind,
  siteUrl: string,
  fromEmail: string,
  adminEmail: string,
): Promise<"sent" | "skipped"> {
  const recipient = kind === "admin_cancelled" ? adminEmail : order.customer_email?.trim();
  if (!validEmail(recipient)) {
    // Do not mark as sent: a corrected email can be retried on a later run.
    throw new Error(`Cannot send ${kind}: recipient email is missing or invalid.`);
  }

  const { data: token, error: claimError } = await client.rpc("claim_unpaid_order_email", {
    p_order_id: order.id,
    p_email_kind: kind,
  });
  if (claimError) throw new Error(`Email claim failed: ${claimError.message}`);
  if (!token || typeof token !== "string") return "skipped";

  const content = emailTemplate(kind, order, siteUrl);
  const { data, error } = await resend.emails.send(
    {
      from: fromEmail,
      to: [recipient!],
      replyTo: "support@aeelixir.com",
      subject: content.subject,
      html: content.html,
      text: content.text,
    },
    // Resend also suppresses duplicated calls with the same request for 24h.
    { idempotencyKey: `ae-elixir-unpaid/${kind}/${order.id}` },
  );
  if (error || !data?.id) {
    throw new Error(`Resend rejected ${kind}: ${error?.message || "No message ID returned."}`);
  }

  const { data: marked, error: markError } = await client.rpc("mark_unpaid_order_email_sent", {
    p_order_id: order.id,
    p_email_kind: kind,
    p_claim_token: token,
    p_provider_email_id: data.id,
  });
  if (markError || marked !== true) {
    throw new Error(
      `Resend accepted ${kind} but DB confirmation failed; investigate before retrying: ${markError?.message || "Unexpected mark response."}`,
    );
  }
  return "sent";
}

/** This is the original read-only check, kept as the default behavior. */
async function dryRun(client: SupabaseClient) {
  const nowMs = Date.now();
  const counts: Record<UnpaidOrderAction, number> = {
    not_enrolled: 0, not_eligible: 0, invalid_dates: 0,
    cancel: 0, remind: 0, waiting: 0,
  };
  const examples: Array<{ order: string; wouldDo: UnpaidOrderAction; deadline: string }> = [];
  let reviewed = 0;
  let completed = false;

  for (let page = 0; page < 100; page++) {
    const { data, error } = await client
      .from("orders")
      .select("id,created_at,payment_due_at,payment_reminder_sent_at,payment_status,order_status,inventory_restocked,auto_cancelled_at")
      .not("payment_due_at", "is", null)
      .eq("payment_status", "pending")
      .eq("order_status", "pending")
      .eq("inventory_restocked", false)
      .order("payment_due_at", { ascending: true })
      .order("id", { ascending: true })
      .range(page * SCAN_LIMIT, (page + 1) * SCAN_LIMIT - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as UnpaidOrderCheck[];
    for (const order of rows) {
      const action = getUnpaidOrderAction(order, nowMs);
      counts[action]++;
      reviewed++;
      if ((action === "remind" || action === "cancel") && examples.length < 10) {
        examples.push({
          order: order.id.slice(0, 8).toUpperCase(),
          wouldDo: action,
          deadline: order.payment_due_at ?? "",
        });
      }
    }
    if (rows.length < SCAN_LIMIT) { completed = true; break; }
  }
  if (!completed) throw new Error("Read-only scan exceeded 50,000 orders; no actions taken.");

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
  return {
    phase: "4D.2",
    mode: "DRY_RUN_ONLY",
    timestampUtc: new Date(nowMs).toISOString(),
    checkedEnrolledPendingOrders: reviewed,
    wouldSendReminders: counts.remind,
    wouldCancelOrders: counts.cancel,
    awaitingDeadlineOrAlreadyReminded: counts.waiting,
    invalidDateRows: counts.invalid_dates,
    examples,
    simulation: {
      unpaidAfter30Hours: getUnpaidOrderAction(mock(30, 18), nowMs),
      unpaidAfter49Hours: getUnpaidOrderAction(mock(49, -1), nowMs),
      unpaidAfter8Hours: getUnpaidOrderAction(mock(8, 40), nowMs),
      paidAfter49Hours: getUnpaidOrderAction(mock(49, -1, true), nowMs),
    },
    noChangesMade: true,
    noEmailsSent: true,
    activationRequired: "UNPAID_ORDER_AUTOMATION_ENABLED=true",
  };
}

async function runEnabled(client: SupabaseClient) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aeelixir.com";
  const fromEmail = process.env.ORDER_FROM_EMAIL || "AE Elixir <support@aeelixir.com>";
  const adminEmail = process.env.ADMIN_ORDER_EMAIL?.trim() || "";
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!validEmail(adminEmail) || !apiKey) {
    throw new Error("Missing or invalid ADMIN_ORDER_EMAIL or RESEND_API_KEY; no actions started.");
  }
  if (new URL(siteUrl).protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must be HTTPS; no actions started.");
  }

  const resend = new Resend(apiKey);
  const nowMs = Date.now();
  const stats = {
    phase: "4D.2", mode: "LIVE_ENABLED",
    timestampUtc: new Date(nowMs).toISOString(),
    checkedPendingOrders: 0, remindersSent: 0, ordersCancelled: 0,
    customerCancellationEmailsSent: 0, adminCancellationEmailsSent: 0,
    emailsAlreadyClaimedOrSent: 0, failedOperations: 0,
    issues: [] as Array<{ order: string; stage: string; reason: string }>,
  };

  const issue = (id: string, stage: string, error: unknown) => {
    stats.failedOperations++;
    const reason = error instanceof Error ? error.message : String(error);
    console.error("Unpaid order automation error", { order: id, stage, reason });
    if (stats.issues.length < 15) stats.issues.push({ order: id.slice(0, 8), stage, reason });
  };

  // Read a fixed snapshot before modifying any rows. This avoids offset
  // pagination problems when rows leave the pending set after cancellation.
  const { data: pending, error: pendingError } = await client
    .from("orders")
    .select(ORDER_COLUMNS)
    .not("payment_due_at", "is", null)
    .eq("payment_status", "pending")
    .eq("order_status", "pending")
    .eq("inventory_restocked", false)
    .order("payment_due_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(SCAN_LIMIT);
  if (pendingError) throw new Error(`Unable to list pending orders: ${pendingError.message}`);
  const pendingRows = (pending ?? []) as unknown as OrderRow[];
  stats.checkedPendingOrders = pendingRows.length;

  for (const order of pendingRows) {
    const action = getUnpaidOrderAction(order, nowMs);
    if (action === "remind" && stats.remindersSent < MAX_REMINDERS_PER_RUN) {
      try {
        const result = await sendOne(client, resend, order, "reminder", siteUrl, fromEmail, adminEmail);
        if (result === "sent") stats.remindersSent++;
        else stats.emailsAlreadyClaimedOrSent++;
      } catch (error) { issue(order.id, "reminder", error); }
    }
    if (action === "cancel" && stats.ordersCancelled < MAX_CANCELLATIONS_PER_RUN) {
      try {
        const { data: outcome, error } = await client.rpc("auto_cancel_unpaid_order", {
          p_order_id: order.id,
          p_dry_run: false,
        });
        if (error) throw new Error(error.message);
        const result = (outcome as { result?: string } | null)?.result;
        if (result === "cancelled") stats.ordersCancelled++;
        else if (result && ["not_expired", "not_eligible", "already_restocked", "not_enrolled"].includes(result)) {
          console.info("Cancellation skipped after atomic eligibility re-check", { order: order.id, result });
        } else throw new Error(`Unexpected cancellation result: ${result ?? "none"}`);
      } catch (error) { issue(order.id, "cancel", error); }
    }
  }

  // A separate scan picks up BOTH newly cancelled orders and cancellations
  // whose email notifications failed on an earlier daily cron run.
  const { data: cancelled, error: cancelledError } = await client
    .from("orders")
    .select(ORDER_COLUMNS)
    .not("auto_cancelled_at", "is", null)
    .eq("order_status", "cancelled")
    .eq("inventory_restocked", true)
    .or("auto_cancel_customer_emailed_at.is.null,auto_cancel_admin_emailed_at.is.null")
    .order("auto_cancelled_at", { ascending: true })
    .limit(SCAN_LIMIT);
  if (cancelledError) throw new Error(`Unable to fetch cancellation notifications: ${cancelledError.message}`);

  let emailBudget = MAX_NOTIFICATIONS_PER_RUN;
  for (const order of (cancelled ?? []) as unknown as OrderRow[]) {
    if (emailBudget <= 0) break;
    // Always prioritize notifying the owner: customer addresses can be invalid.
    if (!order.auto_cancel_admin_emailed_at && emailBudget > 0) {
      emailBudget--;
      try {
        const result = await sendOne(client, resend, order, "admin_cancelled", siteUrl, fromEmail, adminEmail);
        if (result === "sent") stats.adminCancellationEmailsSent++;
        else stats.emailsAlreadyClaimedOrSent++;
      } catch (error) { issue(order.id, "admin_cancelled", error); }
    }
    if (!order.auto_cancel_customer_emailed_at && emailBudget > 0) {
      emailBudget--;
      try {
        const result = await sendOne(client, resend, order, "customer_cancelled", siteUrl, fromEmail, adminEmail);
        if (result === "sent") stats.customerCancellationEmailsSent++;
        else stats.emailsAlreadyClaimedOrSent++;
      } catch (error) { issue(order.id, "customer_cancelled", error); }
    }
  }
  console.info("AE Elixir unpaid-order automation run:", JSON.stringify(stats));
  return stats;
}

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return Response.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503, headers },
    );
  }
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  try {
    if (!ACTIVE) {
      const report = await dryRun(client);
      console.info("AE Elixir unpaid-order cron dry run:", JSON.stringify(report));
      return Response.json(report, { headers });
    }
    const report = await runEnabled(client);
    return Response.json(report, { status: report.failedOperations ? 207 : 200, headers });
  } catch (error) {
    console.error("AE Elixir unpaid-order automation failed:", error);
    return Response.json(
      { error: "Scheduled unpaid-order processing failed.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers },
    );
  }
}
