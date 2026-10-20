/**
 * AE Elixir — Unpaid order automation email templates (Phase 4A).
 *
 * Pure, server-usable HTML + plain-text renderers. Nothing is sent by this
 * module. The cron handler / Resend integration is added in a later phase.
 * Avoid importing this module into a client component.
 */

export type UnpaidOrderEmailData = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number | null;
  payment_method: string | null;
  payment_due_at: string;
};

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const BRAND = "AE Elixir";
const SUPPORT_EMAIL = "support@aeelixir.com";
const BRAND_COLOR = "#A79B8E";
const DARK = "#5F554C";
const BODY = "#6F655C";
const SOFT = "#F6F3EF";
const BORDER = "#E6E0D8";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function orderNumber(order: UnpaidOrderEmailData): string {
  // The existing order lookup identifies orders using their UUID prefix.
  return order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function dueDate(dueAt: string): string {
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Missing or invalid payment_due_at for unpaid-order email.");
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function customerFirstName(order: UnpaidOrderEmailData): string {
  const clean = (order.customer_name ?? "").trim();
  return clean ? clean.split(/\s+/)[0] : "there";
}

function siteLinks(siteUrl: string): { lookup: string; logo: string; admin: string } {
  let site: URL;
  try {
    site = new URL(siteUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a full HTTPS URL.");
  }
  if (site.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS.");
  }
  return {
    lookup: new URL("/order-lookup", site).toString(),
    logo: new URL("/email-logo.png", site).toString(),
    admin: new URL("/master-admin", site).toString(),
  };
}

function layout({
  heading,
  eyebrow,
  greeting,
  paragraphs,
  order,
  siteUrl,
  actionLabel,
  actionUrl,
  isAdmin = false,
}: {
  heading: string;
  eyebrow: string;
  greeting: string;
  paragraphs: string[];
  order: UnpaidOrderEmailData;
  siteUrl: string;
  actionLabel: string;
  actionUrl: string;
  isAdmin?: boolean;
}): string {
  const num = escapeHtml(orderNumber(order));
  const links = siteLinks(siteUrl);
  const due = escapeHtml(dueDate(order.payment_due_at));
  const cost = Number(order.total ?? 0);
  const formattedTotal = Number.isFinite(cost) ? `$${cost.toFixed(2)}` : "N/A";
  const name = escapeHtml(order.customer_name ?? "Not provided");
  const email = escapeHtml(order.customer_email ?? "Not provided");
  const payment = escapeHtml(order.payment_method || "Not specified");

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;background:${SOFT};font-family:Arial,Helvetica,sans-serif;color:${BODY};">
  <div style="padding:24px 12px;background:${SOFT};">
    <div style="max-width:580px;margin:0 auto;background:white;border:1px solid ${BORDER};border-radius:22px;overflow:hidden;">
      <div style="padding:24px 20px 8px;text-align:center;">
        <img src="${escapeHtml(links.logo)}" alt="AE Elixir" width="170" style="max-width:170px;width:100%;height:auto;border:0;display:inline-block;" />
      </div>
      <div style="padding:18px 24px 28px;">
        <p style="text-align:center;color:${BRAND_COLOR};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 10px;">${escapeHtml(eyebrow)}</p>
        <h1 style="text-align:center;color:${DARK};font-size:24px;line-height:1.25;margin:0 0 20px;">${escapeHtml(heading)}</h1>
        <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">${escapeHtml(greeting)}</p>
        ${paragraphs.map(p => `<p style="font-size:14px;line-height:1.75;margin:0 0 13px;">${escapeHtml(p)}</p>`).join("\n        ")}
        <div style="background:#FBFAF8;border:1px solid ${BORDER};border-radius:16px;padding:17px 18px;margin:20px 0;">
          <p style="margin:0 0 10px;color:${BRAND_COLOR};font-weight:700;font-size:11px;letter-spacing:.7px;text-transform:uppercase;">Order details</p>
          <p style="margin:0 0 7px;font-size:14px;"><strong style="color:${DARK};">Order:</strong> #${num}</p>
          ${isAdmin ? `<p style="margin:0 0 7px;font-size:14px;"><strong style="color:${DARK};">Customer:</strong> ${name}</p><p style="margin:0 0 7px;font-size:14px;"><strong style="color:${DARK};">Email:</strong> ${email}</p><p style="margin:0 0 7px;font-size:14px;"><strong style="color:${DARK};">Payment method:</strong> ${payment}</p>` : ""}
          <p style="margin:0 0 7px;font-size:14px;"><strong style="color:${DARK};">Total:</strong> ${escapeHtml(formattedTotal)}</p>
          <p style="margin:0;font-size:14px;"><strong style="color:${DARK};">Payment deadline:</strong> ${due}</p>
        </div>
        <div style="text-align:center;margin:24px 0 6px;">
          <a href="${escapeHtml(actionUrl)}" style="background:${BRAND_COLOR};border-radius:99px;color:#ffffff;display:inline-block;font-size:14px;font-weight:700;padding:14px 24px;text-decoration:none;">${escapeHtml(actionLabel)}</a>
        </div>
        <p style="font-size:12px;text-align:center;line-height:1.7;margin:21px 0 0;">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${DARK};text-decoration:none;">${SUPPORT_EMAIL}</a></p>
      </div>
      <div style="padding:15px;background:#FBFAF8;border-top:1px solid ${BORDER};text-align:center;color:${BODY};font-size:11px;line-height:1.6;">This notification concerns an order placed at AE Elixir.<br/>© ${new Date().getFullYear()} AE Elixir</div>
    </div>
  </div>
</body></html>`;
}

/** Customer: send when a still-unpaid order passes 24h, before its deadline. */
export function buildPaymentReminderEmail(order: UnpaidOrderEmailData, siteUrl: string): EmailContent {
  const num = orderNumber(order);
  const deadline = dueDate(order.payment_due_at);
  const lookup = siteLinks(siteUrl).lookup;
  const name = customerFirstName(order);
  const paragraphs = [
    "Our records show that payment for your AE Elixir order is still pending.",
    `Please complete payment using the instructions in your original order confirmation before ${deadline}. If payment has already been sent, contact support so we can verify it.`,
    "If payment is not confirmed by the deadline, your order may be automatically cancelled."
  ];
  return {
    subject: `${BRAND} Payment Reminder — Order #${num}`,
    html: layout({ heading: "Payment Reminder", eyebrow: "Your order is awaiting payment", greeting: `Hi ${name},`, paragraphs, order, siteUrl, actionLabel: "View Your Order", actionUrl: lookup }),
    text: [`${BRAND} Payment Reminder — Order #${num}`, "", `Hi ${name},`, "", ...paragraphs, "", `Order: #${num}`, `Payment deadline: ${deadline}`, `Order lookup: ${lookup}`, `Support: ${SUPPORT_EMAIL}`].join("\n")
  };
}

/** Customer: send AFTER an order has actually been marked auto-cancelled. */
export function buildCustomerAutoCancellationEmail(order: UnpaidOrderEmailData, siteUrl: string): EmailContent {
  const num = orderNumber(order);
  const name = customerFirstName(order);
  const paragraphs = [
    "Our records still showed payment as pending after the payment deadline, so your order has been automatically cancelled.",
    "If you already sent payment, please contact support with your order number and payment details so we can review the situation. Do not send an additional payment for this cancelled order."
  ];
  const lookup = siteLinks(siteUrl).lookup;
  return {
    subject: `${BRAND} Order #${num} Cancelled — Payment Not Confirmed`,
    html: layout({ heading: "Your Order Was Cancelled", eyebrow: "Unpaid order update", greeting: `Hi ${name},`, paragraphs, order, siteUrl, actionLabel: "View Order Status", actionUrl: lookup }),
    text: [`${BRAND} Order #${num} Cancelled — Payment Not Confirmed`, "", `Hi ${name},`, "", ...paragraphs, "", `Order: #${num}`, `Order lookup: ${lookup}`, `Support: ${SUPPORT_EMAIL}`].join("\n")
  };
}

/** Admin: send AFTER auto-cancellation and inventory restoration succeed. */
export function buildAdminAutoCancellationEmail(order: UnpaidOrderEmailData, siteUrl: string): EmailContent {
  const num = orderNumber(order);
  const adminUrl = siteLinks(siteUrl).admin;
  const paragraphs = [
    "This order was automatically cancelled because payment was still marked pending after its deadline.",
    "The automated cancellation transaction completed and inventory quantities were restored. Review the order in the admin portal if a payment was received outside the website."
  ];
  return {
    subject: `${BRAND} Auto-Cancelled Unpaid Order #${num}`,
    html: layout({ heading: "Unpaid Order Auto-Cancelled", eyebrow: "Admin notification", greeting: "AE Elixir Support,", paragraphs, order, siteUrl, actionLabel: "Open Admin Portal", actionUrl: adminUrl, isAdmin: true }),
    text: [`${BRAND} Auto-Cancelled Unpaid Order #${num}`, "", ...paragraphs, "", `Order: #${num}`, `Customer: ${order.customer_name || "Not provided"}`, `Customer email: ${order.customer_email || "Not provided"}`, `Payment method: ${order.payment_method || "Not specified"}`, `Total: $${Number(order.total ?? 0).toFixed(2)}`, `Admin portal: ${adminUrl}`].join("\n")
  };
}
