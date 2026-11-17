import { createClient } from "@supabase/supabase-js";
import { adsReply } from "@/lib/ads-server";
import { previewEnabled } from "@/lib/referral-preview";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(request: Request) {
  if (!previewEnabled) return { response: adsReply({ error: "Referral portal is unavailable." }, 404) };
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { response: adsReply({ error: "Sign in to your referral account." }, 401) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response: adsReply({ error: "Referral login is unavailable." }, 503) };
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: "Bearer " + token } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email_confirmed_at) {
    return { response: adsReply({ error: "Verify your email and sign in again." }, 401) };
  }
  return { db };
}

export async function GET(request: Request) {
  try {
    const access = await authorize(request);
    if (access.response) return access.response;
    const { data, error } = await access.db.rpc("referrer_portal_overview");
    if (error?.code === "42501") return adsReply({ error: error.message }, 403);
    if (error) throw error;
    return adsReply(data);
  } catch {
    return adsReply({ error: "Could not load your referral dashboard. Try refreshing." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const access = await authorize(request);
    if (access.response) return access.response;
    const body = await request.json().catch(() => null);
    let result;
    if (body?.action === "issue_credit" && typeof body.requestId === "string" && uuidPattern.test(body.requestId)
      && Number.isSafeInteger(body.amountCents) && body.amountCents >= 1 && body.amountCents <= 999999999) {
      result = await access.db.rpc("issue_my_referral_credit_voucher", {
        p_request_id: body.requestId, p_amount_cents: body.amountCents,
      });
    } else if (body?.action === "return_credit" && typeof body.voucherId === "string" && uuidPattern.test(body.voucherId)) {
      result = await access.db.rpc("return_my_referral_credit_voucher", { p_voucher_id: body.voucherId });
    } else {
      return adsReply({ error: "Choose a valid credit code or amount." }, 400);
    }
    if (result.error?.code === "42501") return adsReply({ error: result.error.message }, 403);
    if (result.error?.code === "P0001") return adsReply({ error: result.error.message }, 400);
    if (result.error) throw result.error;
    return adsReply({ voucher: result.data });
  } catch {
    return adsReply({ error: "Could not update your credit code. Retry the same request." }, 500);
  }
}
