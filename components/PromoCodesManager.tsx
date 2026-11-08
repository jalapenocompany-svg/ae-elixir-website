"use client";

import { useState, type FormEvent } from "react";
import type { PromoCode, PromoDiscountType } from "@/lib/promotions";

const inputClass = "w-full rounded-xl border border-[#E6E0D8] px-3 py-2";
const buttonClass = "rounded-full bg-[#473C33] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const newDraft = { code: "", type: "percentage" as PromoDiscountType, amount: "", shippingMethod: "", minimum: "0", limit: "", start: "", end: "", enabled: false };

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function PromoCodesManager() {
  const [key, setKey] = useState("");
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [shippingMethods, setShippingMethods] = useState<{ name: string; display_label: string }[]>([]);
  const [draft, setDraft] = useState(newDraft);
  const [editing, setEditing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function request(body?: unknown) {
    const response = await fetch("/api/admin/promo-codes", {
      method: body ? "POST" : "GET",
      headers: { "x-promo-admin-key": key, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The request failed.");
    return result;
  }

  async function load(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request();
      setCodes(result.codes);
      setShippingMethods(result.shippingMethods || []);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function edit(code: PromoCode) {
    setDraft({
      code: code.code, type: code.discount_type || "percentage",
      shippingMethod: code.eligible_shipping_method || "",
      amount: String(code.fixed_amount ?? code.percent_off ?? ""), minimum: String(code.minimum_subtotal),
      limit: code.max_uses === null ? "" : String(code.max_uses),
      start: localDateTime(code.starts_at), end: localDateTime(code.ends_at), enabled: code.enabled,
    });
    setEditing(true);
    setFormOpen(true);
    setError("");
    setNotice("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { promo } = await request({
        mode: editing ? "edit" : "create",
        promo: {
          code: draft.code.trim().toUpperCase(),
          discount_type: draft.type,
          percent_off: draft.type === "percentage" ? Number(draft.amount) : null,
          fixed_amount: draft.type === "fixed" ? Number(draft.amount) : null,
          eligible_shipping_method: draft.type === "free_shipping" ? draft.shippingMethod || null : null,
          minimum_subtotal: Number(draft.minimum),
          max_uses: draft.limit ? Number(draft.limit) : null,
          starts_at: draft.start ? new Date(draft.start).toISOString() : null,
          ends_at: draft.end ? new Date(draft.end).toISOString() : null,
          enabled: draft.enabled,
        },
      }) as { promo: PromoCode };
      setCodes((current) => [...(current ?? []).filter((code) => code.code !== promo.code), promo]
        .sort((a, b) => a.code.localeCompare(b.code)));
      setFormOpen(false);
      setNotice(`${promo.code} saved.`);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 text-[#5F554C]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Promo Codes</h2>
          <p className="mt-1 text-sm text-[#6F655C]">Manage checkout discounts, schedules, and usage limits.</p>
        </div>
        {codes !== null && (
          <button type="button" className={buttonClass} disabled={busy}
            onClick={() => { setEditing(false); setDraft(newDraft); setFormOpen(true); setNotice(""); setError(""); }}>
            + New code
          </button>
        )}
      </div>
      {codes === null ? (
        <form onSubmit={load} className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#E6E0D8] bg-white p-5">
          <label className="text-sm font-medium">
            Promo admin password
            <input className={inputClass} type="password" autoComplete="off" value={key}
              onChange={(event) => setKey(event.target.value)} required />
          </label>
          <button className={buttonClass} disabled={busy}>Unlock promo codes</button>
        </form>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-[#E6E0D8] bg-white shadow-sm">
            <h3 className="border-b border-[#E6E0D8] px-5 py-4 text-sm font-bold">Current codes</h3>
            {codes.length === 0 && <p className="px-5 py-4 text-sm">No promo codes yet.</p>}
            <ul className="divide-y divide-[#E6E0D8]">
              {codes.map((code) => (
                <li key={code.code} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{code.code}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${code.enabled
                        ? "bg-green-50 text-green-800" : "bg-[#F4F0EC] text-[#6F655C]"}`}>
                        {code.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#6F655C]">
                      {code.discount_type === "free_shipping"
                        ? (code.eligible_shipping_method
                          ? `Free shipping (${shippingMethods.find((method) => method.name === code.eligible_shipping_method)?.display_label ?? code.eligible_shipping_method})`
                          : "Free shipping (any paid method)")
                        : code.discount_type === "fixed" ? `$${Number(code.fixed_amount).toFixed(2)} off`
                        : `${code.percent_off}% off`} · ${Number(code.minimum_subtotal).toFixed(2)} minimum · {code.uses}{code.max_uses ? ` / ${code.max_uses}` : ""} uses
                    </p>
                    {(code.starts_at || code.ends_at) && (
                      <p className="mt-1 text-xs text-[#6F655C]">
                        {code.starts_at ? new Date(code.starts_at).toLocaleString() : "Any start"}
                        {" → "}
                        {code.ends_at ? new Date(code.ends_at).toLocaleString() : "No expiration"}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => edit(code)} disabled={busy} aria-label={`Edit ${code.code}`}
                    className="rounded-full border border-[#D8D1C8] px-4 py-2 text-sm font-semibold hover:bg-[#F8F5F1]">
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {formOpen && <form onSubmit={save} className="space-y-4 rounded-2xl border border-[#E6E0D8] bg-white p-5 shadow-sm">
            <h3 className="font-bold">{editing ? `Edit ${draft.code}` : "Create a promo code"}</h3>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Code
                <input className={inputClass} required readOnly={editing} minLength={3} maxLength={32} value={draft.code}
                  onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} />
              </label>
              <label className="text-sm">Discount type
                <select className={inputClass} value={draft.type}
                  onChange={(event) => setDraft({ ...draft, type: event.target.value as PromoDiscountType, amount: "", shippingMethod: "" })}>
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </label>
              {draft.type === "free_shipping" && (
                <label className="text-sm">Eligible shipping method
                  <select className={inputClass} value={draft.shippingMethod}
                    onChange={(event) => setDraft({ ...draft, shippingMethod: event.target.value })}>
                    <option value="">Any paid shipping method</option>
                    {draft.shippingMethod && !shippingMethods.some((method) => method.name === draft.shippingMethod) && (
                      <option value={draft.shippingMethod} disabled>{draft.shippingMethod} (unavailable)</option>
                    )}
                    {shippingMethods.map((method) => <option key={method.name} value={method.name}>{method.display_label}</option>)}
                  </select>
                </label>
              )}
              {draft.type !== "free_shipping" && (
                <label className="text-sm">{draft.type === "fixed" ? "Amount off ($)" : "Percent off"}
                  <input className={inputClass} required type="number" min="0.01"
                    max={draft.type === "fixed" ? "9999999999.99" : "100"} step="0.01" value={draft.amount}
                    onChange={(event) => setDraft({ ...draft, amount: event.target.value })} />
                </label>
              )}
              <label className="text-sm">Minimum merchandise subtotal ($)
                <input className={inputClass} required type="number" min="0" step="0.01" value={draft.minimum}
                  onChange={(event) => setDraft({ ...draft, minimum: event.target.value })} />
              </label>
              <label className="text-sm">Usage limit (optional)
                <input className={inputClass} type="number" min="1" step="1" value={draft.limit}
                  onChange={(event) => setDraft({ ...draft, limit: event.target.value })} />
              </label>
              <label className="text-sm">Starts at (optional)
                <input className={inputClass} type="datetime-local" value={draft.start}
                  onChange={(event) => setDraft({ ...draft, start: event.target.value })} />
              </label>
              <label className="text-sm">Expires at (optional)
                <input className={inputClass} type="datetime-local" value={draft.end}
                  onChange={(event) => setDraft({ ...draft, end: event.target.value })} />
              </label>
              <p className="text-sm text-[#6F655C] sm:col-span-2">
                Times use your device time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                Cancelled orders still count toward the usage limit.
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.enabled}
                  onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Enabled
              </label>
            </fieldset>
            <div className="flex gap-3">
              <button className={buttonClass} disabled={busy}>{editing ? "Save changes" : "Create code"}</button>
              <button type="button" className="px-3 text-sm font-semibold" disabled={busy}
                onClick={() => { setFormOpen(false); setError(""); }}>Cancel</button>
            </div>
          </form>}
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
    </section>
  );
}
