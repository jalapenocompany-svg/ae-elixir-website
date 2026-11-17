"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type RewardType = "none" | "percent" | "fixed";

type Profile = {
  id: string;
  display_name: string;
  email: string;
  code: string;
  enabled: boolean;
  user_id: string | null;
  reward_type: RewardType;
  reward_value: number;
  minimum_order_cents: number;
};
const empty = {
  id: "", display_name: "", email: "", code: "", enabled: true,
  reward_type: "none" as RewardType, rewardAmount: "", minimumOrder: "",
};
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function rewardLabel(profile: Profile) {
  if (profile.reward_type === "none") return "No credit rule";
  const amount = profile.reward_type === "percent"
    ? (profile.reward_value / 100) + "%"
    : currency.format(profile.reward_value / 100);
  return profile.minimum_order_cents > 0
    ? amount + " credit on orders of " + currency.format(profile.minimum_order_cents / 100) + "+"
    : amount + " credit per referred order";
}

type ReferralSales = { paidOrders: number; months: { month: string; total: number }[] };

function ReferralOverview({ count, sales }: { count: number | undefined; sales: ReferralSales | null }) {
  const metrics = [
    { label: "Referrers", value: count, caption: "Total profiles" },
    { label: "Referred orders", value: sales?.paidOrders, caption: "Paid orders" },
    { label: "Credits given", caption: "Awaiting credit tracking" },
    { label: "Credits used", caption: "Awaiting credit tracking" },
  ];
  const months = sales?.months ?? [];
  const max = Math.max(1, ...months.map(({ total }) => total));

  return (
    <>
      <h2 className="text-2xl font-bold tracking-tight">Referral overview</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, caption }) => (
          <div key={label} className="rounded-[24px] border border-[#E6E0D8] bg-white p-4 shadow-sm sm:p-5">
            <dt className="text-sm font-semibold text-[#6F655C]">{label}</dt>
            <dd className="mt-2 text-2xl font-bold">{value?.toLocaleString("en-US") ?? "—"}</dd>
            <dd className="mt-1 text-xs text-[#7F756B]">{caption}</dd>
          </div>
        ))}
      </dl>
      <section className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold">Referral sales</h3>
        <p className="mt-1 text-sm text-[#6F655C]">Last 5 months · paid orders</p>
        {months.length ? (
          <ul className="mt-5 grid grid-cols-5 gap-2 text-center sm:gap-4">
            {months.map(({ month, total }) => (
              <li key={month} className="min-w-0">
                <div aria-hidden="true" className="flex h-28 items-end justify-center border-b border-[#E6E0D8] bg-[#FBFAF8] sm:h-40">
                  <div className="w-2/3 max-w-16 rounded-t-lg bg-[#A79B8E]" style={{ height: (100 * total / max) + "%" }} />
                </div>
                <span className="mt-2 block text-xs text-[#7F756B]">
                  {new Date(month + "-01T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" })}
                </span>
                <span className="block break-words text-xs font-semibold">{currency.format(total)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl bg-[#FBFAF8] p-5 text-sm text-[#6F655C]">Referral sales are unavailable.</p>
        )}
      </section>
    </>
  );
}

const input = "min-w-0 w-full rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm text-[#5F554C] outline-none transition focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20";
const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A79B8E] disabled:cursor-not-allowed disabled:opacity-50";
const button = buttonBase + " border-[#D8D1C8] bg-white text-[#5F554C] hover:bg-[#F6F3EF]";
const primary = buttonBase + " border-[#A79B8E] bg-[#A79B8E] text-white hover:bg-[#958879]";
const danger = buttonBase + " border-[#E8D7D1] bg-white text-[#A75C50] hover:bg-[#FCF4F1]";
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

async function request(method: string, profile?: typeof empty, id?: string, signal?: AbortSignal) {
  const response = await fetch("/api/admin/referrers" + (id ? "?id=" + encodeURIComponent(id) : ""), {
    method,
    headers: { "x-referral-preview": "true", "Content-Type": "application/json" },
    body: profile ? JSON.stringify({
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
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(false);
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

  async function copyLink(profile: Profile) {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/" + profile.code.toLowerCase());
      setNotice("Referral link copied for " + profile.display_name + ".");
    } catch {
      setNotice("Could not copy the link. You can copy it directly from the referral row.");
    }
  }

  return (
    <section className="space-y-5 text-[#5F554C]">
      <ReferralOverview count={profiles?.length} sales={sales} />
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
              <input required type="email" maxLength={254} autoComplete="email" className={input} value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
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
          <div className="flex flex-wrap gap-3">
            <button className={primary} disabled={busy}>{busy ? "Saving…" : "Save referrer"}</button>
            <button type="button" className={button} disabled={busy} onClick={() => { setEditing(false); setDraft(empty); }}>Cancel</button>
          </div>
        </form>
      )}

      {notice && <p role="status" className="rounded-2xl border border-[#E6E0D8] bg-[#F6F3EF] px-4 py-3 text-sm">{notice}</p>}
      <div className="overflow-hidden rounded-[24px] border border-[#E6E0D8] bg-white shadow-sm" aria-busy={loading || busy}>
        {loading && <p role="status" className="p-6 text-sm text-[#7F756B]">Loading referrers…</p>}
        {!loading && profiles === null && (
          <div className="p-6">
            <button type="button" disabled={busy} className={button} onClick={() => void perform(async () => {
              const data = await request("GET");
              setProfiles(data.profiles);
              setSales(data.overview);
            })}>Try again</button>
          </div>
        )}
        {profiles?.length === 0 && <div className="p-8 text-center">
          <h3 className="font-semibold">Your first referral link starts here</h3>
          <p className="mt-2 text-sm text-[#7F756B]">Add a referrer to create their personal link.</p>
        </div>}
        <ul className="divide-y divide-[#E6E0D8]">
          {profiles?.map((profile) => {
            const link = "/" + profile.code.toLowerCase();
            const initials = profile.display_name.trim().split(/\s+/).slice(0, 2).map((name) => name[0]).join("").toUpperCase();
            return (
              <li key={profile.id} className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E6DDD2] bg-[#F3EEE8] text-sm font-bold text-[#8B7B6B]">{initials}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-bold">{profile.display_name}</h3>
                      <span className={"rounded-full px-2.5 py-1 text-[11px] font-semibold " + (profile.enabled ? "bg-[#EDF3EE] text-[#48634E]" : "bg-[#F1EEEA] text-[#7F756B]")}>
                        {profile.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-sm text-[#7F756B]">{profile.email}</p>
                    <p className="mt-1 text-sm text-[#6F655C]">{rewardLabel(profile)}</p>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex max-w-full items-center gap-2 text-sm font-semibold text-[#8B7B6B] underline decoration-[#D8D1C8] underline-offset-4 hover:text-[#5F554C]">
                      <Icon name="link" /><span className="min-w-0 break-all">{link}</span>
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:shrink-0">
                  <button type="button" className={button} disabled={busy || !profile.enabled} onClick={() => void copyLink(profile)} aria-label={"Copy link for " + profile.display_name}><Icon name="copy" /> Copy link</button>
                  <button type="button" className={button} disabled={busy || !!profile.user_id} onClick={() => openEditor(profile)} aria-label={"Edit " + profile.display_name}><Icon name="edit" /> Edit</button>
                  <button type="button" className={danger} disabled={busy || !!profile.user_id} onClick={() => remove(profile)} aria-label={"Delete " + profile.display_name}><Icon name="trash" /> Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
