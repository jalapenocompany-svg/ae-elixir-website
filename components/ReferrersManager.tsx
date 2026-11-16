"use client";

import { useState, type FormEvent } from "react";

type Profile = { id: string; display_name: string; email: string; code: string; enabled: boolean; user_id: string | null };
const empty = { id: "", display_name: "", email: "", code: "", enabled: true };
const input = "rounded-xl border border-[#D8D1C8] bg-white px-3 py-2";
const button = "rounded-full border border-[#D8D1C8] px-4 py-2 font-semibold disabled:opacity-50";

export default function ReferrersManager() {
  const [key, setKey] = useState("");
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [draft, setDraft] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function request(method: string, profile?: typeof empty, id?: string) {
    const url = "/api/admin/referrers" + (id ? "?id=" + encodeURIComponent(id) : "");
    const response = await fetch(url, {
      method,
      headers: { "x-referral-admin-key": key, "Content-Type": "application/json" },
      body: profile ? JSON.stringify(profile.id ? profile : { ...profile, id: null }) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

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

  function unlock(event: FormEvent) {
    event.preventDefault();
    void perform(async () => setProfiles((await request("GET")).profiles));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const { profile } = await request("POST", draft);
      setProfiles((current) => [...(current ?? []).filter((item) => item.id !== profile.id), profile]
        .sort((a, b) => a.display_name.localeCompare(b.display_name)));
      setDraft(empty);
      setNotice("Referrer saved.");
    });
  }

  function remove(profile: Profile) {
    if (!window.confirm("Delete " + profile.display_name + " and their referral link?")) return;
    void perform(async () => {
      await request("DELETE", undefined, profile.id);
      setProfiles((current) => (current ?? []).filter((item) => item.id !== profile.id));
      setDraft(empty);
      setNotice("Referrer deleted.");
    });
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[#E6E0D8] bg-white p-5 text-[#5F554C]">
      <h2 className="text-xl font-bold">Referrers</h2>
      <p className="text-sm">Manage referral links and preview how they appear at checkout.</p>
      {!profiles ? (
        <form className="flex flex-wrap gap-3" onSubmit={unlock}>
          <input aria-label="Referral admin key" type="password" value={key} required className={input}
            onChange={(event) => setKey(event.target.value)} />
          <button className={button} disabled={busy}>Unlock Referrals</button>
        </form>
      ) : (
        <>
          <form onSubmit={save} className="space-y-3 rounded-2xl border border-[#E6E0D8] p-4">
            <h3 className="font-bold">{draft.id ? "Edit referrer" : "Add referrer"}</h3>
            <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">Display name
                <input required maxLength={80} className={input} value={draft.display_name}
                  onChange={(event) => setDraft({ ...draft, display_name: event.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">Email
                <input required type="email" maxLength={254} className={input} value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              </label>
              <label className="grid gap-1 text-sm">Referral code
                <input required minLength={3} maxLength={32} className={input} value={draft.code}
                  onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={draft.enabled}
                  onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Enable link
              </label>
            </fieldset>
            <div className="flex gap-2">
              <button className={button} disabled={busy}>Save referrer</button>
              {draft.id && <button type="button" className={button} disabled={busy} onClick={() => setDraft(empty)}>Cancel</button>}
            </div>
          </form>
          {profiles.length === 0 && <p className="text-sm">No referrers yet.</p>}
          <ul className="divide-y divide-[#E6E0D8]">
            {profiles.map((profile) => {
              const link = "/" + profile.code.toLowerCase();
              return (
                <li key={profile.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-bold">{profile.display_name} · {profile.enabled ? "Enabled" : "Disabled"}</p>
                    <p className="text-sm">{profile.email}</p>
                    {profile.enabled && <a className="text-sm underline" href={link}>{link}</a>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={button} disabled={busy || !!profile.user_id} onClick={() => setDraft(profile)}>Edit</button>
                    <button type="button" className={button} disabled={busy || !!profile.user_id} onClick={() => remove(profile)}>Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </section>
  );
}
