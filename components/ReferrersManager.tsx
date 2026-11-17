"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ReferralSalesGraph from "@/components/ReferralSalesChart";

type RewardType = "none" | "percent" | "fixed";

type Profile = {
  id: string;
  display_name: string;
  email: string;
  code: string;
  enabled: boolean;
  user_id: string | null;
  portal_invited_at?: string | null;
  reward_type: RewardType;
  reward_value: number;
  minimum_order_cents: number;
};
const empty = {
  id: "", display_name: "", email: "", code: "", enabled: true,
  reward_type: "none" as RewardType, rewardAmount: "", minimumOrder: "",
};
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type ReferralSales = { paidOrders: number; months: { month: string; total: number }[] };

type CreditRequest = {
  action: "issue_credit";
  requestId: string;
  referrerId: string;
  amountCents: number;
} | { action: "return_credit"; voucherId: string } | { action: "invite"; referrerId: string };
type CreditVoucher = {
  id: string;
  referrerId: string;
  code: string;
  amountCents: number;
  status: "issued" | "spent" | "released";
  paid: boolean;
};
type ReferralCredits = {
  earnedCents: number;
  usedCents?: number;
  referrers: {
    id: string; earnedCents: number;
    availableCents?: number; reservedCents?: number; usedCents?: number;
  }[];
  vouchers?: CreditVoucher[];
};

function ReferralOverview({ count, sales, credits }: {
  count: number | undefined;
  sales: ReferralSales | null;
  credits: ReferralCredits | null;
}) {
  const metrics = [
    { label: "Referrers", value: count, caption: "Total profiles" },
    { label: "Referred orders", value: sales?.paidOrders, caption: "Paid orders" },
    { label: "Credits given", value: credits ? currency.format(credits.earnedCents / 100) : undefined, caption: "Earned on paid orders" },
    { label: "Credits used", value: credits?.usedCents === undefined ? undefined : currency.format(credits.usedCents / 100), caption: "Redeemed on paid orders" },
  ];
  const months = sales?.months ?? [];

  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight">Referral overview</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, caption }) => (
          <div key={label} className="rounded-[24px] border border-[#E6E0D8] bg-white p-4 shadow-sm sm:p-5">
            <dt className="text-sm font-semibold text-[#6F655C]">{label}</dt>
            <dd className="mt-2 text-2xl font-bold">{(typeof value === "number" ? value.toLocaleString("en-US") : value) ?? "—"}</dd>
            <dd className="mt-1 text-xs text-[#7F756B]">{caption}</dd>
          </div>
        ))}
      </dl>
      <section className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold">Referral sales</h3>
        {months.length ? (
          <>
            <div className="lg:hidden">
              <ReferralSalesGraph months={months.slice(-5)} />
            </div>
            <div className="hidden lg:block">
              <ReferralSalesGraph months={months.slice(-12)} desktop />
            </div>
          </>
        ) : (
          <p className="mt-5 rounded-2xl bg-[#FBFAF8] p-5 text-sm text-[#6F655C]">Referral sales are unavailable.</p>
        )}
      </section>
    </>
  );
}

const input = "min-w-0 w-full rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm text-[#5F554C] outline-none transition focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20";
const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A79B8E] disabled:cursor-not-allowed disabled:opacity-50";
const button = buttonBase + " px-4 border-[#D8D1C8] bg-white text-[#5F554C] hover:bg-[#F6F3EF]";
const primary = buttonBase + " px-4 border-[#A79B8E] bg-[#A79B8E] text-white hover:bg-[#958879]";
const danger = buttonBase + " px-0 border-[#E8D7D1] bg-white text-[#A75C50] hover:bg-[#FCF4F1]";
const compactButton = buttonBase + " px-2 border-[#D8D1C8] bg-white text-[#5F554C] hover:bg-[#F6F3EF]";
const paths = {
  add: "M12 5v14M5 12h14",
  edit: "m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5",
  copy: "M9 9h11v11H9zM5 15H3V3h12v2",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
};

function Icon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" className="block h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

async function request(method: string, profile?: typeof empty | CreditRequest, id?: string, signal?: AbortSignal) {
  const response = await fetch("/api/admin/referrers" + (id ? "?id=" + encodeURIComponent(id) : ""), {
    method,
    headers: { "x-referral-preview": "true", "Content-Type": "application/json" },
    body: profile ? JSON.stringify("action" in profile ? profile : {
      id: profile.id || null,
      display_name: profile.display_name,
      email: profile.email,
      code: profile.code,
      enabled: profile.enabled,
      reward_type: profile.reward_type,
      reward_value: profile.reward_type === "none" ? 0 : Math.round(Number(profile.rewardAmount) * 100),
      minimum_order_cents: profile.reward_type === "none" ? 0 : Math.round(Number(profile.minimumOrder) * 100),
    }) : undefined,
    signal,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export default function ReferrersManager() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [sales, setSales] = useState<ReferralSales | null>(null);
  const [credits, setCredits] = useState<ReferralCredits | null>(null);
  const [draft, setDraft] = useState(empty);
  const [voucherDraft, setVoucherDraft] = useState({ referrerId: "", amount: "", requestId: "" });
  const [editing, setEditing] = useState(false);
  const [expandedReferrers, setExpandedReferrers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    request("GET", undefined, undefined, controller.signal)
      .then((data) => {
        setProfiles(data.profiles);
        setSales(data.overview);
        setCredits(data.credits);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : "Could not load referrers.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (editing) nameInput.current?.focus();
  }, [editing, draft.id]);

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function openEditor(profile?: Profile) {
    setDraft(profile ? {
      ...profile,
      rewardAmount: profile.reward_type === "none" ? "" : String(profile.reward_value / 100),
      minimumOrder: profile.minimum_order_cents ? String(profile.minimum_order_cents / 100) : "",
    } : empty);
    setEditing(true);
    setNotice("");
  }

  function save(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const { profile } = await request("POST", draft);
      setProfiles((current) => [...(current ?? []).filter((item) => item.id !== profile.id), profile]
        .sort((a, b) => a.display_name.localeCompare(b.display_name)));
      setDraft(empty);
      setEditing(false);
      setNotice("Referrer saved.");
    });
  }

  function remove(profile: Profile) {
    if (!window.confirm("Delete " + profile.display_name + " and their referral link?")) return;
    void perform(async () => {
      await request("DELETE", undefined, profile.id);
      setProfiles((current) => (current ?? []).filter((item) => item.id !== profile.id));
      if (draft.id === profile.id) {
        setDraft(empty);
        setEditing(false);
      }
      setNotice("Referrer deleted.");
    });
  }

  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setNotice("Could not copy. Select the displayed text to copy it manually.");
    }
  }

  function invite(profile: Profile) {
    if (!window.confirm("Send a portal password link to " + profile.email + "?")) return;
    void perform(async () => {
      await request("POST", { action: "invite", referrerId: profile.id });
      setProfiles((current) => (current ?? []).map((item) =>
        item.id === profile.id ? { ...item, portal_invited_at: new Date().toISOString() } : item));
      setNotice("Portal password link sent to " + profile.email + ".");
    });
  }

  function returnVoucher(voucher: CreditVoucher) {
    if (!window.confirm("Cancel this unused code and return its reserved credit to the referrer?")) return;
    void perform(async () => {
      await request("POST", { action: "return_credit", voucherId: voucher.id });
      setNotice("Unused code canceled and credit returned.");
      try {
        const data = await request("GET");
        setProfiles(data.profiles);
        setSales(data.overview);
        setCredits(data.credits);
      } catch {
        setNotice("Credit returned. Reopen Referrals to refresh the balance.");
      }
    });
  }

  function createVoucher(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const amountCents = Math.round(Number(voucherDraft.amount) * 100);
      const result = await request("POST", {
        action: "issue_credit", requestId: voucherDraft.requestId,
        referrerId: voucherDraft.referrerId, amountCents,
      });
      setVoucherDraft({ referrerId: "", amount: "", requestId: "" });
      setNotice("Created discount code " + result.voucher.promo_code + ".");
      try {
        const data = await request("GET");
        setProfiles(data.profiles);
        setSales(data.overview);
        setCredits(data.credits);
      } catch {
        setNotice("Code " + result.voucher.promo_code + " created. Reopen Referrals to refresh the balance.");
      }
    });
  }

  const linkedLogin = !!profiles?.find((profile) => profile.id === draft.id)?.user_id;

  return (
    <section className="space-y-5 text-[#5F554C]">
      <ReferralOverview count={profiles?.length} sales={sales} credits={credits} />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A79B8E]">Referral links</p>
          <h2 className="text-2xl font-bold tracking-tight">Referrers</h2>
        </div>
        <button type="button" className={primary} disabled={busy || loading || profiles === null}
          aria-expanded={editing} aria-controls="referrer-editor" onClick={() => openEditor()}>
          <Icon name="add" /> Add referrer
        </button>
      </div>

      {editing && (
        <form id="referrer-editor" onSubmit={save} className="space-y-5 rounded-[24px] border border-[#E6E0D8] bg-[#FBFAF8] p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-bold">{draft.id ? "Edit referrer" : "Add referrer"}</h3>
          <fieldset disabled={busy} className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-sm font-semibold">Display name
              <input ref={nameInput} required maxLength={80} autoComplete="name" className={input} value={draft.display_name}
                onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">Email
              <input required type="email" maxLength={254} autoComplete="email" readOnly={linkedLogin} className={input} value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              {linkedLogin && <span className="text-xs font-normal text-[#7F756B]">Linked to portal login.</span>}
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">Referral code
              <input required minLength={3} maxLength={32} autoCapitalize="characters"
                spellCheck={false} className={input} value={draft.code} placeholder="MARIA10"
                onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} />
              <span className="break-all text-xs font-normal text-[#7F756B]">
                Link · /{draft.code.toLowerCase() || "maria10"}
              </span>
            </label>
            <label className="flex min-h-11 items-center gap-3 self-start rounded-2xl border border-[#E6E0D8] bg-white p-4 text-sm md:mt-7">
              <input type="checkbox" className="h-4 w-4 accent-[#A79B8E]" checked={draft.enabled}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
              Enable referral link
            </label>
          </fieldset>
          <fieldset disabled={busy} className="grid min-w-0 gap-4 rounded-2xl border border-[#E6E0D8] bg-white p-4 md:grid-cols-3">
            <legend className="px-2 text-sm font-bold">Earning rule</legend>
            <label className="grid gap-2 text-sm font-semibold">Reward type
              <select className={input} value={draft.reward_type}
                onChange={(event) => setDraft({
                  ...draft, reward_type: event.target.value as RewardType, rewardAmount: "",
                })}>
                <option value="none">No credit</option>
                <option value="percent">Percentage of order total</option>
                <option value="fixed">Fixed credit per order</option>
              </select>
            </label>
            {draft.reward_type !== "none" && (
              <>
                <label className="grid gap-2 text-sm font-semibold">
                  {draft.reward_type === "percent" ? "Reward (%)" : "Credit amount ($)"}
                  <input required type="number" inputMode="decimal" min="0.01" step="0.01"
                    max={draft.reward_type === "percent" ? 100 : 9999999.99} className={input}
                    value={draft.rewardAmount} onChange={(event) => setDraft({ ...draft, rewardAmount: event.target.value })} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">Minimum order ($)
                  <input type="number" inputMode="decimal" min="0" step="0.01" max="9999999.99" placeholder="No minimum"
                    className={input} value={draft.minimumOrder}
                    onChange={(event) => setDraft({ ...draft, minimumOrder: event.target.value })} />
                </label>
              </>
            )}
          </fieldset>
          <p className="text-xs leading-5 text-[#7F756B]">
            Rewards use the order total after discounts, including shipping. Rule changes apply to new orders.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={primary} disabled={busy}>{busy ? "Saving…" : "Save referrer"}</button>
            <button type="button" className={button} disabled={busy} onClick={() => { setEditing(false); setDraft(empty); }}>Cancel</button>
          </div>
        </form>
      )}

      {notice && <p role="status" className="rounded-2xl border border-[#E6E0D8] bg-[#F6F3EF] px-4 py-3 text-sm">{notice}</p>}
      <div aria-busy={loading || busy}>
        {loading && <p role="status" className="p-6 text-sm text-[#7F756B]">Loading referrers…</p>}
        {!loading && profiles === null && (
          <div className="p-6">
            <button type="button" disabled={busy} className={button} onClick={() => void perform(async () => {
              const data = await request("GET");
              setProfiles(data.profiles);
              setSales(data.overview);
        setCredits(data.credits);
            })}>Try again</button>
          </div>
        )}
        {profiles?.length === 0 && <div className="p-8 text-center">
          <h3 className="font-semibold">Your first referral link starts here</h3>
          <p className="mt-2 text-sm text-[#7F756B]">Add a referrer to create their personal link.</p>
        </div>}
        <ul className="grid gap-4 md:grid-cols-2">
          {profiles?.map((profile) => {
            const link = "/" + profile.code.toLowerCase();
            const expanded = expandedReferrers.includes(profile.id);
            const initials = profile.display_name.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
            const balance = credits?.referrers.find((item) => item.id === profile.id);
            const vouchers = (credits?.vouchers ?? []).filter((item) => item.referrerId === profile.id);
            const available = balance?.availableCents;
            const earned = balance?.earnedCents ?? (credits ? 0 : undefined);
            const reward = profile.reward_type === "none" ? "Not set"
              : profile.reward_type === "percent" ? (profile.reward_value / 100) + "%"
              : currency.format(profile.reward_value / 100);
            return (
              <li key={profile.id} className="min-w-0 self-start overflow-hidden rounded-[24px] border border-[#E6E0D8] bg-white shadow-sm">
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E1D6C9] bg-[#F3EEE8] text-sm font-bold text-[#796958]">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-base font-bold leading-6">{profile.display_name}</h3>
                      <p className="mt-0.5 break-all text-xs leading-5 text-[#7F756B]">{profile.email}</p>
                    </div>
                    <span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold " + (profile.enabled ? "bg-[#EDF3EE] text-[#48634E]" : "bg-[#F1EEEA] text-[#7F756B]")}>
                      {profile.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[#E6E0D8] bg-[#FBFAF8] px-3 py-2 text-xs font-semibold text-[#796958] hover:bg-[#F3EEE8]">
                      <Icon name="link" /><span className="min-w-0 break-all">{link}</span>
                    </a>
                    <button type="button"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E6E0D8] bg-[#FBFAF8] text-[#796958] transition hover:bg-[#F3EEE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A79B8E]"
                      aria-expanded={expanded}
                      aria-controls={"referrer-details-" + profile.id}
                      aria-label={(expanded ? "Collapse" : "Expand") + " details for " + profile.display_name}
                      onClick={() => setExpandedReferrers((current) => current.includes(profile.id)
                        ? current.filter((id) => id !== profile.id)
                        : [...current, profile.id])}>
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" className={"transition-transform " + (expanded ? "rotate-180" : "")}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  <div id={"referrer-details-" + profile.id} hidden={!expanded} className="space-y-4">
                    <p className="text-xs text-[#7F756B]">{profile.user_id ? "Portal login linked" : profile.portal_invited_at ? "Invitation sent" : "Portal invitation pending"}</p>

                    <dl className="grid grid-cols-2 gap-3 border-y border-[#E6E0D8] py-4">
                      <div className="min-w-0">
                        <dt className="text-xs text-[#7F756B]">Reward per order</dt>
                        <dd className="mt-1 text-lg font-bold">{reward}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-[#7F756B]">Minimum order</dt>
                        <dd className="mt-1 text-lg font-bold">{profile.minimum_order_cents > 0 ? currency.format(profile.minimum_order_cents / 100) : "No minimum"}</dd>
                      </div>
                    </dl>

                    <div className="rounded-2xl border border-[#DDE6DD] bg-[#F1F5F0] p-4">
                      <p className="text-xs font-semibold text-[#58705B]">Available credit</p>
                      <p className="mt-1 break-words text-3xl font-bold tracking-tight text-[#38513D]">
                        {available === undefined ? "—" : currency.format(available / 100)}
                      </p>
                      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#DDE6DD] pt-3 text-xs">
                        <div><dt className="text-[#68766A]">Earned</dt><dd className="mt-1 break-words font-semibold text-[#38513D]">{earned === undefined ? "—" : currency.format(earned / 100)}</dd></div>
                        <div><dt className="text-[#68766A]">Reserved</dt><dd className="mt-1 break-words font-semibold text-[#38513D]">{balance?.reservedCents === undefined ? "—" : currency.format(balance.reservedCents / 100)}</dd></div>
                        <div><dt className="text-[#68766A]">Used</dt><dd className="mt-1 break-words font-semibold text-[#38513D]">{balance?.usedCents === undefined ? "—" : currency.format(balance.usedCents / 100)}</dd></div>
                      </dl>
                    </div>

                    {voucherDraft.referrerId === profile.id && (
                      <form onSubmit={createVoucher} className="space-y-3 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4">
                        <label className="grid gap-2 text-sm font-semibold">Discount code amount ($)
                          <input required type="number" inputMode="decimal" min="0.01" step="0.01"
                            max={(available ?? 0) / 100} className={input} value={voucherDraft.amount} disabled={busy}
                            onChange={(event) => setVoucherDraft({ ...voucherDraft, amount: event.target.value, requestId: crypto.randomUUID() })} />
                        </label>
                        <p className="text-xs leading-5 text-[#7F756B]">One use. Minimum merchandise subtotal equals the code amount.</p>
                        <div className="flex flex-wrap gap-2">
                          <button className={primary} disabled={busy}>{busy ? "Creating…" : "Create code"}</button>
                          <button type="button" className={button} disabled={busy} onClick={() => setVoucherDraft({ referrerId: "", amount: "", requestId: "" })}>Cancel</button>
                        </div>
                      </form>
                    )}

                    <button type="button" className={button + " w-full"} disabled={busy || !profile.enabled} onClick={() => invite(profile)}>
                      {profile.user_id ? "Send password link" : profile.portal_invited_at ? "Resend invitation" : "Send invitation"}
                    </button>
                    <button type="button" className={primary + " w-full"} disabled={busy || !profile.enabled || available === undefined || available < 1}
                      onClick={() => { setNotice(""); setVoucherDraft({ referrerId: profile.id, amount: "", requestId: crypto.randomUUID() }); }}>
                      <Icon name="add" /> Create discount code
                    </button>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2">
                      <button type="button" className={compactButton} disabled={busy || !profile.enabled}
                        aria-label={"Copy referral link for " + profile.display_name} onClick={() => void copy(window.location.origin + link, "Referral link copied for " + profile.display_name + ".")}>
                        <Icon name="copy" /> Copy
                      </button>
                      <button type="button" className={compactButton} disabled={busy} aria-label={"Edit " + profile.display_name} onClick={() => openEditor(profile)}>
                        <Icon name="edit" /> Edit
                      </button>
                      <button type="button" className={danger} disabled={busy || !!profile.user_id} onClick={() => remove(profile)}
                        title={"Delete " + profile.display_name} aria-label={"Delete " + profile.display_name}><Icon name="trash" /></button>
                    </div>
                    {vouchers.length > 0 && (
                      <details className="border-t border-[#E6E0D8] pt-3">
                        <summary className="cursor-pointer py-2 text-sm font-semibold">Discount codes ({vouchers.length})</summary>
                        <ul className="mt-2 space-y-2">
                          {vouchers.map((voucher) => (
                            <li key={voucher.id} className="rounded-xl border border-[#E6E0D8] bg-[#FBFAF8] p-3">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-semibold">{currency.format(voucher.amountCents / 100)}</span>
                                <span className="text-[#7F756B]">{voucher.status === "released" ? "Returned" : voucher.status === "issued" ? "Ready to use" : voucher.paid ? "Used" : "Applied to order"}</span>
                              </div>
                              <div className="mt-2 flex min-w-0 items-center gap-2">
                                <code className="min-w-0 flex-1 break-all text-xs text-[#5F554C]">{voucher.code}</code>
                                <button type="button" className={button + " shrink-0 px-3"} aria-label={"Copy discount code " + voucher.code}
                                  onClick={() => void copy(voucher.code, "Discount code copied.")}><Icon name="copy" /></button>
                              </div>
                              {voucher.status === "issued" && (
                                <button type="button" className="mt-2 min-h-11 text-xs font-semibold text-[#796958] underline underline-offset-4 disabled:opacity-50"
                                  disabled={busy} onClick={() => returnVoucher(voucher)}>Return credit</button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
