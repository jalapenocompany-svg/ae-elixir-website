"use client";

import { useEffect, useState, type FormEvent } from "react";
import { reportDate, type DetailedReport, type ReportFilters, type ReportRow, type ReportView } from "@/lib/referral-report";

const money = (value: number | undefined, cents = false) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
}).format(Number(value ?? 0) / (cents ? 100 : 1));
const panel = "rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-6";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D8D1C8] bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-[#F6F3EF] disabled:cursor-not-allowed disabled:opacity-50";
const input = "min-h-11 min-w-0 w-full rounded-2xl border border-[#D8D1C8] bg-white px-3 py-2 text-sm outline-none focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20";
function initialFilters(): ReportFilters {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (name: string) => parts.find(p => p.type === name)?.value;
  const today = get("year") + "-" + get("month") + "-" + get("day");
  return { start: today.slice(0,8) + "01", end: today, referrer: "", status: "all", view: "orders" };
}
function Status({ value }: { value: string }) {
  const color = ["paid","redeemed"].includes(value) ? "bg-[#EDF4EE] text-[#38513D]"
    : ["closed","returned"].includes(value) ? "bg-[#F9EEE9] text-[#995749]" : "bg-[#F3EFE8] text-[#78654A]";
  return <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize " + color}>{value}</span>;
}
function OrderId({ value }: { value: string }) {
  return <span title={value} className="font-semibold">#{value.slice(0,8).toUpperCase()}</span>;
}

export default function ReferralReport({ profiles }: { profiles: { id: string; display_name: string; enabled: boolean }[] }) {
  const [draft, setDraft] = useState<ReportFilters>(initialFilters);
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DetailedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setNotice(""); setData(null);
    const query = new URLSearchParams({ ...filters, page: String(page) });
    fetch("/api/admin/referrers/report?" + query, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load the report.");
        if (!controller.signal.aborted) {
          const lastPage = Math.max(0, Math.ceil(result.rowCount / result.pageSize) - 1);
          if (page > lastPage) setPage(lastPage);
          else setData(result);
        }
      }).catch(error => { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Could not load the report."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, revision]);
  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.start && draft.end && draft.start > draft.end) { setNotice("Start date must come before the end date."); return; }
    setPage(0); setFilters({ ...draft }); setRevision(v => v + 1);
  }
  function changeView(view: ReportView) {
    setPage(0);
    setDraft(current => ({ ...current, view, status: "all" }));
    setFilters(current => ({ ...current, view, status: "all" }));
  }
  async function exportCsv() {
    setExporting(true); setNotice("");
    try {
      const query = new URLSearchParams({ ...filters, format: "csv" });
      const response = await fetch("/api/admin/referrers/report?" + query, { cache: "no-store" });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "Could not export the report."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "referral-" + filters.view + "-report.csv";
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not export the report."); }
    finally { setExporting(false); }
  }
  const orders = filters.view === "orders";
  const summary = data?.summary;
  const metrics = orders ? [
    ["Paid sales", summary ? money(summary.paidSales) : "—"],
    ["Paid orders", summary?.paidOrders ?? "—"],
    ["Pending orders", summary?.pendingOrders ?? "—"],
    ["Canceled / refunded", summary?.closedOrders ?? "—"],
    ["Credit earned", summary ? money(summary.earnedCents,true) : "—"],
  ] : [
    ["Reserved credit", summary ? money(summary.reservedCents,true) : "—"],
    ["Redeemed credit", summary ? money(summary.usedCents,true) : "—"],
    ["Returned credit", summary ? money(summary.returnedCents,true) : "—"],
  ];
  const dirty = JSON.stringify(draft) !== JSON.stringify(filters);
  const pages = data ? Math.max(1, Math.ceil(data.rowCount / data.pageSize)) : 1;
  function RowDetails({ row }: { row: ReportRow }) {
    return orders ? <>
      <div><dt className="text-xs text-[#7F756B]">Order total</dt><dd className="mt-1 font-semibold">{money(row.total)}</dd></div>
      <div><dt className="text-xs text-[#7F756B]">Credit earned</dt><dd className="mt-1 font-semibold text-[#38513D]">{money(row.earned_cents,true)}</dd></div>
      <div className="col-span-2"><dt className="text-xs text-[#7F756B]">Payment / order status</dt><dd className="mt-1 text-sm">{row.payment_status || "pending"} · {row.order_status || "pending"}</dd></div>
      <div className="col-span-2 break-all"><dt className="text-xs text-[#7F756B]">Discount / code</dt><dd className="mt-1 text-sm">{money(row.discount_amount)} · {row.promo_code || "No code"}{row.redeems_credit ? " · Referral credit redemption" : ""}</dd></div>
    </> : <>
      <div><dt className="text-xs text-[#7F756B]">Amount</dt><dd className="mt-1 font-semibold">{money(row.amount_cents,true)}</dd></div>
      <div><dt className="text-xs text-[#7F756B]">Applied to order</dt><dd className="mt-1">{row.order_id ? <OrderId value={row.order_id} /> : "—"}</dd></div>
    </>;
  }
  return <section className="space-y-5" aria-label="Referral reporting">
    <div className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-[#A79B8E]">Sales & credit reporting</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Referral report</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7F756B]">Review referred orders and the credit codes issued to your referrers.</p></div>
        <button type="button" className={button} disabled={loading || exporting || !data?.rowCount || dirty} onClick={exportCsv}>{exporting ? "Exporting…" : "Export CSV"}</button>
      </div>
      <div className="mt-5 flex gap-2 rounded-2xl bg-[#F6F3EF] p-1" aria-label="Report view">
        {(["orders","codes"] as ReportView[]).map(view => <button key={view} type="button" aria-pressed={filters.view === view} onClick={() => changeView(view)}
          className={"min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition " + (filters.view === view ? "bg-white shadow-sm" : "text-[#7F756B]")}>{view === "orders" ? "Referred orders" : "Credit codes"}</button>)}
      </div>
      <form onSubmit={apply} className="mt-5 grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid min-w-0 gap-2 text-xs font-semibold">From<input type="date" className={input} value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-xs font-semibold">Through<input type="date" className={input} value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} /></label>
        <label className="grid min-w-0 gap-2 text-xs font-semibold">Referrer<select className={input} value={draft.referrer} onChange={e => setDraft({ ...draft, referrer: e.target.value })}><option value="">All referrers</option>{profiles.map(p => <option key={p.id} value={p.id}>{p.display_name}{p.enabled ? "" : " (disabled)"}</option>)}</select></label>
        <label className="grid min-w-0 gap-2 text-xs font-semibold">Order status<select className={input} disabled={!orders} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option value="all">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="closed">Canceled / refunded</option></select></label>
        <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#A79B8E] bg-[#A79B8E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#958879] disabled:opacity-50" disabled={loading}>Apply filters</button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#7F756B]">
        <button type="button" className="min-h-8 underline underline-offset-4" onClick={() => setDraft({ ...draft, start: "", end: "" })}>Choose all time</button>
        <span>{orders ? "Dates filter order placement. Paid sales include shipping and applied discounts." : "Dates filter code issuance. Values show each code’s current state, not when it was redeemed or returned."} All dates use Eastern Time.</span>
      </div>
      {dirty && <p className="mt-2 text-xs font-semibold text-[#78654A]">Apply your changes to update the report and export.</p>}
    </div>
    {notice && <div role="alert" className={panel + " text-sm text-[#995749]"}>{notice}<button type="button" className="ml-3 underline" onClick={() => setRevision(v => v + 1)}>Retry</button></div>}
    <dl className={"grid grid-cols-2 gap-3 " + (orders ? "lg:grid-cols-5" : "lg:grid-cols-3")}>
      {metrics.map(([label,value]) => <div key={label} className={panel + " min-w-0 !p-4"}><dt className="text-xs font-semibold text-[#7F756B]">{label}</dt><dd className="mt-2 break-words text-xl font-bold" aria-busy={loading}>{value}</dd></div>)}
    </dl>
    <div className={panel} aria-busy={loading}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">{orders ? "Referred orders" : "Credit codes"}</h3><p className="text-xs text-[#7F756B]" aria-live="polite">{loading ? "Loading…" : data ? data.rowCount.toLocaleString() + " matching records" : "Report unavailable"}</p></div>
      {loading ? <p className="py-8 text-center text-sm text-[#7F756B]" role="status">Loading your report…</p> : data?.rows.length === 0 ? <p className="rounded-2xl bg-[#FBFAF8] px-4 py-8 text-center text-sm text-[#7F756B]">No records match these filters.</p> : data && <>
        <div className="space-y-3 lg:hidden">
          {data.rows.map(row => <article key={row.id} className="rounded-2xl border border-[#E6E0D8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{orders ? <OrderId value={row.id} /> : row.display_name}</p><Status value={(orders ? row.category : row.credit_state) || "pending"} /></div>
            <p className="mt-2 text-xs text-[#7F756B]">{reportDate(row.created_at)}{orders ? " · " + row.display_name : ""}</p>
            <p className="mt-2 break-all text-xs">{orders ? "/" + row.referral_code.toLowerCase() : row.promo_code}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E6E0D8] pt-3"><RowDetails row={row} /></dl>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E6E0D8] text-xs text-[#7F756B]"><tr>{(orders ? ["Order / date","Referrer","Status","Order total","Discount","Credit earned"] : ["Code / issued","Referrer","Current state","Amount","Applied order"]).map(label => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#E6E0D8]">{data.rows.map(row => <tr key={row.id} className="align-top">
              <td className="px-3 py-4">{orders ? <OrderId value={row.id} /> : <span className="break-all font-semibold">{row.promo_code}</span>}<p className="mt-1 text-xs text-[#7F756B]">{reportDate(row.created_at)}</p></td>
              <td className="px-3 py-4"><p className="font-semibold">{row.display_name}</p><p className="mt-1 text-xs text-[#7F756B]">/{row.referral_code.toLowerCase()}</p></td>
              <td className="px-3 py-4"><Status value={(orders ? row.category : row.credit_state) || "pending"} />{orders && <p className="mt-2 text-xs text-[#7F756B]">{row.payment_status || "pending"} · {row.order_status || "pending"}</p>}</td>
              {orders ? <><td className="px-3 py-4 font-semibold">{money(row.total)}</td><td className="max-w-48 px-3 py-4">{money(row.discount_amount)}<p className="mt-1 break-all text-xs text-[#7F756B]">{row.promo_code || "No code"}</p>{row.redeems_credit && <p className="mt-1 text-xs text-[#7F756B]">Referral credit redemption</p>}</td><td className="px-3 py-4 font-semibold text-[#38513D]">{money(row.earned_cents,true)}</td></> : <><td className="px-3 py-4 font-semibold">{money(row.amount_cents,true)}</td><td className="px-3 py-4">{row.order_id ? <OrderId value={row.order_id} /> : "—"}</td></>}
            </tr>)}</tbody>
          </table>
        </div>
      </>}
      {data && data.rowCount > 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E0D8] pt-4">
        <p className="text-xs text-[#7F756B]">Page {page + 1} of {pages} · CSV exports all matching records</p>
        <div className="flex gap-2"><button type="button" className={button} disabled={loading || page === 0} onClick={() => setPage(v => v - 1)}>Previous</button><button type="button" className={button} disabled={loading || page + 1 >= pages} onClick={() => setPage(v => v + 1)}>Next</button></div>
      </div>}
    </div>
  </section>;
}
