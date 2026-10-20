import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import {
  buildAdminAutoCancellationEmail,
  buildCustomerAutoCancellationEmail,
  buildPaymentReminderEmail,
  type UnpaidOrderEmailData,
} from "@/lib/unpaid-order-emails";

export const runtime = "nodejs";

const VALID_TYPES = ["reminder", "customer-cancelled", "admin-cancelled"] as const;
type TestEmailType = (typeof VALID_TYPES)[number];

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length < 32) return false;

  const supplied = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(supplied, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Phase 4B: test existing email templates in isolation.
 * This endpoint NEVER reads or changes Supabase orders, inventory or payment state.
 * All test mail is sent only to the configured ADMIN_ORDER_EMAIL address.
 * Remove this endpoint after the production automation is fully validated if desired.
 */
export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: { type?: unknown; mode?: unknown };
  try {
    input = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON request body." }, { status: 400 });
  }

  const type = input?.type;
  const mode = input?.mode ?? "preview";
  if (!VALID_TYPES.some((item) => item === type)) {
    return Response.json(
      { error: "type must be reminder, customer-cancelled, or admin-cancelled." },
      { status: 400 }
    );
  }
  if (mode !== "preview" && mode !== "send") {
    return Response.json({ error: "mode must be preview or send." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aeelixir.com";
  const fakeOrder: UnpaidOrderEmailData = {
    id: "TEST0001", // Displays as #TEST0001; never references a real order.
    customer_name: "Test Customer",
    customer_email: "test@example.invalid", // Never used as an email recipient.
    total: 40,
    payment_method: "Zelle",
    payment_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const builders = {
    reminder: buildPaymentReminderEmail,
    "customer-cancelled": buildCustomerAutoCancellationEmail,
    "admin-cancelled": buildAdminAutoCancellationEmail,
  } as const;

  try {
    const content = builders[type as TestEmailType](fakeOrder, siteUrl);

    if (mode === "preview") {
      return Response.json({
        mode: "preview",
        type,
        subject: `[TEST] ${content.subject}`,
        text: content.text,
        note: "Preview only: no email sent and no database changes.",
      });
    }

    const adminEmail = process.env.ADMIN_ORDER_EMAIL?.trim();
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.ORDER_FROM_EMAIL || "AE Elixir <support@aeelixir.com>";

    if (!adminEmail || !apiKey) {
      return Response.json(
        { error: "ADMIN_ORDER_EMAIL or RESEND_API_KEY is missing." },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      replyTo: "support@aeelixir.com",
      subject: `[TEST] ${content.subject}`,
      html: content.html,
      text: `TEST MESSAGE ONLY. NO ORDER WAS MODIFIED.\n\n${content.text}`,
    });

    if (error) {
      console.error("Unpaid order template test send failed:", { type, error });
      return Response.json(
        { error: "Resend rejected the test email.", details: error.message },
        { status: 502 }
      );
    }

    return Response.json({
      mode: "send",
      type,
      testOnly: true,
      recipient: adminEmail,
      resendId: data?.id ?? null,
      note: "Email submitted to Resend. No order or inventory changed.",
    });
  } catch (error) {
    console.error("Unpaid order template test failed:", { type, error });
    return Response.json(
      { error: error instanceof Error ? error.message : "Email test failed." },
      { status: 500 }
    );
  }
}
