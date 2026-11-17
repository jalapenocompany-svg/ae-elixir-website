export type ReportView = "orders" | "codes";
export type ReportFilters = { start: string; end: string; referrer: string; status: string; view: ReportView };
export type ReportRow = {
  id: string; created_at: string; display_name: string; referral_code: string;
  total?: number; payment_status?: string | null; order_status?: string | null;
  promo_code?: string | null; discount_amount?: number; category?: string;
  earned_cents?: number; redeems_credit?: boolean; amount_cents?: number;
  order_id?: string | null; credit_state?: string;
};
export type DetailedReport = {
  rowCount: number; pageSize: number; rows: ReportRow[];
  summary: { paidOrders: number; pendingOrders: number; closedOrders: number; paidSales: number;
    earnedCents: number; reservedCents: number; usedCents: number; returnedCents: number };
};

export function parseReportQuery(params: URLSearchParams) {
  const date = (name: string) => {
    const value = params.get(name) || "";
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" ||
      value > "9999-12-30" || Number.isNaN(Date.parse(value)) ||
      new Date(value).toISOString().slice(0,10) !== value)) throw new Error("Choose valid report dates.");
    return value;
  };
  const start = date("start"), end = date("end");
  if (start && end && start > end) throw new Error("Start date must come before the end date.");
  const referrer = params.get("referrer") || "";
  if (referrer && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(referrer))
    throw new Error("Choose a valid referrer.");
  const status = params.get("status") || "all", view = params.get("view") || "orders";
  const page = params.get("page") || "0", format = params.get("format") || "json";
  if (!["all","paid","pending","closed"].includes(status) || !["orders","codes"].includes(view) ||
    !/^\d+$/.test(page) || Number(page) > 100000 || !["json","csv"].includes(format))
    throw new Error("Invalid report filters.");
  return { p_start: start || null, p_end: end || null, p_referrer: referrer || null,
    p_status: view === "codes" ? "all" : status, p_view: view, p_page: Number(page), p_export: format === "csv" };
}

// Dates in CSV match the report's Eastern Time date boundaries.
export const reportDate = (date: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "short", day: "numeric",
}).format(new Date(date));

export function reportCsv(rows: ReportRow[], view: ReportView) {
  const headers = view === "orders"
    ? ["Order ID","Order date (Eastern Time)","Referrer","Referral code","Payment status","Order status","Report status","Order total USD","Discount USD","Promo code","Redeems referral credit","Credit earned USD"]
    : ["Voucher ID","Issued date (Eastern Time)","Referrer","Referral code","Discount code","Amount USD","Current credit state","Order ID","Payment status","Order status"];
  const money = (value: number | undefined, cents = false) => (Number(value ?? 0) / (cents ? 100 : 1)).toFixed(2);
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const values = rows.map(r => view === "orders"
    ? [r.id,reportDate(r.created_at),r.display_name,r.referral_code,r.payment_status,r.order_status,r.category,
      money(r.total),money(r.discount_amount),r.promo_code,r.redeems_credit ? "Yes" : "No",money(r.earned_cents,true)]
    : [r.id,reportDate(r.created_at),r.display_name,r.referral_code,r.promo_code,money(r.amount_cents,true),r.credit_state,r.order_id,r.payment_status,r.order_status]);
  return "\uFEFF" + [headers,...values].map(row => row.map(cell).join(",")).join("\r\n");
}
