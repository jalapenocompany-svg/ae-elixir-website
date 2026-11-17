"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import SiteHeader from "@/components/SiteHeader";
import ReferralSalesGraph from "@/components/ReferralSalesChart";
import { referrerAuth } from "@/lib/referrer-auth-client";

type PortalData = {
  profile: { name: string; email: string; code: string; rewardType: "none" | "percent" | "fixed"; rewardValue: number; minimumOrderCents: number };
  sales: { pendingOrders?: number; paidOrders: number; total: number; months: { month: string; total: number }[] };
  credits: { earnedCents: number; availableCents: number; reservedCents: number; usedCents: number };
  vouchers: { id: string; code: string; amountCents: number; status: "issued" | "spent" | "released"; paid: boolean; createdAt: string }[];
  recentSales: { id: string; createdAt: string; total: number; creditCents: number }[];
};
type Action = { action: "issue_credit"; requestId: string; amountCents: number }
  | { action: "return_credit"; voucherId: string };
type AuthMode = "sign_in" | "reset" | "password";
type InvitationToken = { hash: string; type: "invite" | "recovery" };

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const card = "rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-6";
const input = "min-h-12 w-full min-w-0 rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm text-[#5F554C] outline-none focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20";
const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A79B8E] disabled:cursor-not-allowed disabled:opacity-50";
const button = buttonBase + " border border-[#D8D1C8] bg-white text-[#5F554C] hover:bg-[#F6F3EF]";
const primary = buttonBase + " border border-[#A79B8E] bg-[#A79B8E] text-white hover:bg-[#958879]";

async function portalRequest(action: Action, signal?: AbortSignal): Promise<{ voucher: { promo_code: string } }>;
async function portalRequest(action?: undefined, signal?: AbortSignal): Promise<PortalData>;
async function portalRequest(action?: Action, signal?: AbortSignal): Promise<PortalData | { voucher: { promo_code: string } }> {
  const { data, error } = await referrerAuth.auth.getSession();
  if (error || !data.session) throw new Error("Sign in to your referral account.");
  const response = await fetch("/api/referrer-portal", {
    method: action ? "POST" : "GET",
    headers: { Authorization: "Bearer " + data.session.access_token, "Content-Type": "application/json" },
    body: action ? JSON.stringify(action) : undefined,
    cache: "no-store",
    credentials: "omit",
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not load your referral account.");
  return result;
}

export default function ReferrerPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [invitationToken, setInvitationToken] = useState<InvitationToken | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [amount, setAmount] = useState("");
  const [requestId, setRequestId] = useState("");
  const activeUser = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const hash = params.get("token_hash");
    const tokenType = params.get("type");
    if (hash && hash.length <= 512 && (tokenType === "invite" || tokenType === "recovery")) {
      setInvitationToken({ hash, type: tokenType });
      setMode("password");
    }
    function applySession(next: Session | null) {
      if (!active) return;
      if (activeUser.current !== next?.user.id) {
        activeUser.current = next?.user.id;
        setData(null);
        setLoadError("");
        setAmount("");
        setRequestId("");
      }
      setSession(next);
      setAuthReady(true);
    }
    const { data: listener } = referrerAuth.auth.onAuthStateChange((event, next) => {
      applySession(next);
      if (active && event === "PASSWORD_RECOVERY") setMode("password");
    });
    async function restoreSession() {
      try {
        const initial = await referrerAuth.auth.initialize();
        const current = await referrerAuth.auth.getSession();
        applySession(current.data.session);
        if (!active) return;
        const params = new URLSearchParams(window.location.search);
        if (initial.error || current.error) {
          setNotice((initial.error || current.error)!.message);
        } else if (params.get("mode") === "recovery") {
          if (current.data.session && !params.has("code") && !params.has("error")) {
            setMode("password");
          } else {
            setNotice("Open the reset link in the browser where you requested it, or request a new link.");
          }
        }
      } catch {
        if (active) { setAuthReady(true); setNotice("Could not restore your login. Please sign in again."); }
      }
    }
    void restoreSession();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    portalRequest(undefined, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setData(null);
          setLoadError(error instanceof Error ? error.message : "Could not load your account.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session?.access_token]);

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      setData(await portalRequest());
    } catch (error) {
      setData(null);
      setLoadError(error instanceof Error ? error.message : "Could not refresh your account.");
    } finally {
      setLoading(false);
    }
  }

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const loginEmail = email.trim().toLowerCase();
      const redirect = window.location.origin + "/referrer-portal";
      if (mode === "reset") {
        const result = await referrerAuth.auth.resetPasswordForEmail(loginEmail, { redirectTo: redirect + "?mode=recovery" });
        if (result.error) throw result.error;
        setNotice("If this email has an account, a password reset link will arrive shortly. Open it in this browser.");
      } else if (mode === "password") {
        if (invitationToken) {
          const verified = await referrerAuth.auth.verifyOtp({ token_hash: invitationToken.hash, type: invitationToken.type });
          if (verified.error) throw verified.error;
          setInvitationToken(null);
          const setupUrl = new URL(window.location.href);
          setupUrl.searchParams.delete("token_hash");
          setupUrl.searchParams.delete("type");
          setupUrl.searchParams.set("mode", "recovery");
          window.history.replaceState({}, "", setupUrl);
        }
        const result = await referrerAuth.auth.updateUser({ password });
        if (result.error) throw result.error;
        const url = new URL(window.location.href);
        url.searchParams.delete("mode");
        window.history.replaceState({}, "", url);
        setMode("sign_in");
        setNotice("Password updated.");
      } else {
        const result = await referrerAuth.auth.signInWithPassword({ email: loginEmail, password });
        if (result.error) throw result.error;
      }
      setPassword("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not complete this login request.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setNotice("");
    const { error } = await referrerAuth.auth.signOut({ scope: "local" });
    if (error) setNotice(error.message);
    else { setMode("sign_in"); setData(null); setPassword(""); }
    setBusy(false);
  }

  async function copy(value: string, message: string) {
    try { await navigator.clipboard.writeText(value); setNotice(message); }
    catch { setNotice("Could not copy. Select the displayed text to copy it manually."); }
  }

  async function changeCredit(action: Action) {
    setBusy(true);
    setNotice("");
    try {
      const result = await portalRequest(action);
      setNotice(action.action === "issue_credit"
        ? "Created discount code " + result.voucher.promo_code + "."
        : "Unused code canceled and credit returned.");
      setAmount("");
      setRequestId("");
      try { setData(await portalRequest()); }
      catch { setNotice("Credit updated. Refresh your dashboard to view the latest balance and codes."); }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update your credit.");
    } finally {
      setBusy(false);
    }
  }

  function createCode(event: FormEvent) {
    event.preventDefault();
    void changeCredit({ action: "issue_credit", requestId, amountCents: Math.round(Number(amount) * 100) });
  }

  const signedIn = !!session;
  const showAuthForm = !signedIn || mode === "password" || !!invitationToken;
  const titles = { sign_in: "Referrals Portal", reset: "Reset your password", password: "Set your password" };

  return (
    <div className={"min-h-screen text-[#5F554C] " + (showAuthForm ? "bg-gray-50" : "bg-[#F8F9F8]")}>
      {!showAuthForm && <SiteHeader />}
      <div className={showAuthForm
        ? "mx-auto flex min-h-[calc(100dvh-220px)] max-w-6xl flex-col justify-center px-5 py-8"
        : "mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"}>
        {!showAuthForm && <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#A79B8E]">Referrals Portal</p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight">{data?.profile.name || "Your dashboard"}</h1>
          </div>
          {signedIn && <div className="flex gap-2">
            <button type="button" className={button} disabled={busy || loading} onClick={() => void refresh()}>{loading ? "Refreshing…" : "Refresh"}</button>
            <button type="button" className={button} disabled={busy} onClick={() => void signOut()}>Sign out</button>
          </div>}
        </div>}

        {!showAuthForm && notice && <p role="status" className="mb-5 break-words rounded-2xl border border-[#E6E0D8] bg-[#F3EEE8] px-4 py-3 text-sm leading-6">{notice}</p>}
        {!authReady ? <p role="status" className={card + " mx-auto w-full max-w-sm"}>Loading your account…</p> : showAuthForm ? (
          <section className={card + " mx-auto w-full max-w-sm"}>
            <div className="mb-5 flex flex-col items-center text-center">
              <img src="/logo-icon.png" alt="AE Elixir" className="mb-3 h-16 w-16 object-contain" />
              <h1 className="text-2xl font-bold">{titles[mode]}</h1>
              <p className="mt-1 text-sm text-[#6F655C]">
                {mode === "password" ? "Choose a password to access your dashboard."
                  : mode === "reset" ? "Enter your email to receive a reset link."
                  : "Sign in to your referral dashboard."}
              </p>
            </div>
            {notice && <p role="status" className="mb-4 break-words rounded-xl bg-[#F3EEE8] px-3 py-2 text-sm leading-6">{notice}</p>}
            <form onSubmit={authenticate} className="space-y-4">
              {mode !== "password" && <label className="grid gap-2 text-sm font-semibold">Email
                <input type="email" required autoComplete="email" maxLength={254} className={input} value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} />
              </label>}
              {mode !== "reset" && <label className="grid gap-2 text-sm font-semibold">{mode === "password" ? "New password" : "Password"}
                <input type="password" required minLength={mode === "sign_in" ? 1 : 9}
                  autoComplete={mode === "sign_in" ? "current-password" : "new-password"} className={input}
                  value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
                {mode !== "sign_in" && <span className="text-xs font-normal text-[#7F756B]">At least 9 characters.</span>}
              </label>}
              <button className={primary + " w-full"} disabled={busy}>
                {busy ? "Please wait…" : mode === "reset" ? "Send reset link" : mode === "password" ? "Save password" : "Sign in"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" className="min-h-11 text-sm font-semibold text-[#796958] underline underline-offset-4" disabled={busy}
                onClick={() => {
                  setMode(mode === "sign_in" ? "reset" : "sign_in");
                  setNotice("");
                  setPassword("");
                  setInvitationToken(null);
                  const url = new URL(window.location.href);
                  ["mode", "token_hash", "type", "code"].forEach((key) => url.searchParams.delete(key));
                  window.history.replaceState({}, "", url);
                }}>
                {mode === "sign_in" ? "Forgot password?" : "Back to sign in"}
              </button>
            </div>
          </section>
        ) : loading && !data ? <p role="status" className={card}>Loading your dashboard…</p> : !data ? (
          <section className={card}>
            <h2 className="text-lg font-bold">Account access</h2>
            <p role="alert" className="mt-2 text-sm leading-6">{loadError || "Could not load your referral profile."}</p>
            <button type="button" className={button + " mt-4"} disabled={loading} onClick={() => void refresh()}>Try again</button>
          </section>
        ) : (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                ["Paid orders", data.sales.paidOrders.toLocaleString("en-US")],
                ["Pending orders", data.sales.pendingOrders?.toLocaleString("en-US") ?? "—"],
                ["Referral sales", currency.format(data.sales.total)],
                ["Credit earned", currency.format(data.credits.earnedCents / 100)],
                ["Credit used", currency.format(data.credits.usedCents / 100)],
              ].map(([label, value]) => (
                <div key={label} className={card + " min-w-0 last:col-span-2 lg:last:col-span-1"}>
                  <dt className="text-xs font-semibold text-[#7F756B]">{label}</dt>
                  <dd className="mt-2 break-words text-2xl font-bold">{value}</dd>
                </div>
              ))}
            </dl>

            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Your referral link</h2>
                <button type="button" className={button} onClick={() => void copy(window.location.origin + "/" + data.profile.code.toLowerCase(), "Referral link copied.")}>Copy link</button>
              </div>
              <a className="mt-3 block break-all text-sm font-semibold text-[#796958] underline underline-offset-4" href={"/" + data.profile.code.toLowerCase()}>
                /{data.profile.code.toLowerCase()}
              </a>
              <p className="mt-3 text-sm leading-6 text-[#7F756B]">
                {data.profile.rewardType === "none" ? "Your earning rule is being set up."
                  : (data.profile.rewardType === "percent" ? (data.profile.rewardValue / 100) + "%" : currency.format(data.profile.rewardValue / 100)) + " credit per qualifying paid order."}
                {data.profile.minimumOrderCents > 0 && " Minimum order " + currency.format(data.profile.minimumOrderCents / 100) + "."}
              </p>
            </section>

            <section className={card}>
              <h2 className="text-lg font-bold">Your referral sales</h2>
              <div className="lg:hidden"><ReferralSalesGraph months={data.sales.months.slice(-5)} /></div>
              <div className="hidden lg:block"><ReferralSalesGraph months={data.sales.months.slice(-12)} desktop /></div>
            </section>

            <section className={card + " grid gap-5 md:grid-cols-2"}>
              <div className="rounded-2xl border border-[#DDE6DD] bg-[#F1F5F0] p-5">
                <h2 className="text-sm font-semibold text-[#58705B]">Available credit</h2>
                <p className="mt-2 break-words text-3xl font-bold tracking-tight text-[#38513D]">{currency.format(data.credits.availableCents / 100)}</p>
                <p className="mt-4 text-xs leading-5 text-[#58705B]">Reserved in codes and pending orders · {currency.format(data.credits.reservedCents / 100)}</p>
              </div>
              <form onSubmit={createCode} className="space-y-3">
                <h2 className="text-lg font-bold">Create a discount code</h2>
                <label className="grid gap-2 text-sm font-semibold">Amount ($)
                  <input type="number" required min="0.01" max={Math.max(0, data.credits.availableCents) / 100} step="0.01" inputMode="decimal"
                    className={input} value={amount} disabled={busy || data.credits.availableCents < 1}
                    onChange={(event) => { setAmount(event.target.value); setRequestId(crypto.randomUUID()); }} />
                </label>
                <p className="text-xs leading-5 text-[#7F756B]">One use. Minimum merchandise subtotal equals the code amount.</p>
                <button className={primary} disabled={busy || data.credits.availableCents < 1 || !requestId}>{busy ? "Please wait…" : "Create code"}</button>
              </form>
            </section>

            <section className={card}>
              <h2 className="text-lg font-bold">Your discount codes</h2>
              {data.vouchers.length === 0 ? <p className="mt-3 text-sm text-[#7F756B]">Your codes will appear here when you create one.</p> : (
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {data.vouchers.map((voucher) => (
                    <li key={voucher.id} className="min-w-0 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-lg font-bold">{currency.format(voucher.amountCents / 100)}</p>
                        <span className="rounded-full bg-[#F0ECE6] px-3 py-1 text-xs font-semibold">{voucher.status === "released" ? "Returned" : voucher.status === "issued" ? "Ready to use" : voucher.paid ? "Used" : "Applied to order"}</span>
                      </div>
                      <code className="mt-3 block break-all text-xs text-[#796958]">{voucher.code}</code>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" className={button} onClick={() => void copy(voucher.code, "Discount code copied.")}>Copy code</button>
                        {voucher.status === "issued" && <button type="button" className={button} disabled={busy} onClick={() => {
                          if (window.confirm("Cancel this unused code and return its reserved credit?")) void changeCredit({ action: "return_credit", voucherId: voucher.id });
                        }}>Return credit</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={card}>
              <h2 className="text-lg font-bold">Recent paid referrals</h2>
              {data.recentSales.length === 0 ? <p className="mt-3 text-sm text-[#7F756B]">Paid referral orders will appear here.</p> : (
                <ul className="mt-3 divide-y divide-[#E6E0D8]">
                  {data.recentSales.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <p className="text-sm font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="mt-1 text-xs text-[#7F756B]">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{currency.format(order.total)}</p>
                        <p className="mt-1 text-xs font-semibold text-[#48634E]">Credit · {currency.format(order.creditCents / 100)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
