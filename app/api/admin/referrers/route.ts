import { hasAdminSession, sameAdminOrigin } from "@/lib/admin-session";
import { adsDatabase, adsReply } from "@/lib/ads-server";
import { sendReferrerInvitation } from "@/lib/referral-invitations";
import { findSellerCode, previewEnabled, referralCodePattern, reservedCodes } from "@/lib/referral-preview";

const columns = "id, display_name, email, code, enabled, user_id, reward_type, reward_value, minimum_order_cents, portal_invited_at";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authorize(request: Request) {
  if (!previewEnabled) return adsReply({ error: "Referrals are disabled." }, 404);
  if (!hasAdminSession(request)) {
    return adsReply({ error: "Admin session expired. Sign out and sign in again." }, 401);
  }
  if (!sameAdminOrigin(request)) return adsReply({ error: "Use the same site to manage referrers." }, 403);
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const db = adsDatabase();
    const [profiles, overview, credits, report] = await Promise.all([
      db.from("referrer_profiles").select(columns).order("display_name"),
      db.rpc("referral_sales_overview"),
      db.rpc("referral_credit_overview"),
      db.rpc("referrer_admin_sales"),
    ]);
    if (profiles.error) throw profiles.error;
    return adsReply({ profiles: profiles.data, overview: overview.error ? null : overview.data, credits: credits.error ? null : credits.data, report: report.error ? null : report.data });
  } catch {
    return adsReply({ error: "Could not load referrers. Check that the preview migration was applied." }, 500);
  }
}

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (body?.action === "invite") {
    if (typeof body.referrerId !== "string" || !uuidPattern.test(body.referrerId)) {
      return adsReply({ error: "Choose a valid referrer." }, 400);
    }
    try {
      const origin = request.headers.get("origin") || new URL(request.url).origin;
      return adsReply(await sendReferrerInvitation(body.referrerId, origin));
    } catch (error) {
      return adsReply({ error: error instanceof Error ? error.message : "Could not send the invitation." }, 500);
    }
  }
  if (body?.action === "return_credit") {
    if (typeof body.voucherId !== "string" || !uuidPattern.test(body.voucherId)) {
      return adsReply({ error: "Choose a valid credit code." }, 400);
    }
    try {
      const { data, error } = await adsDatabase().rpc("return_referral_credit_voucher", {
        p_voucher_id: body.voucherId,
      });
      if (error?.code === "P0001") return adsReply({ error: error.message }, 400);
      if (error) throw error;
      return adsReply({ voucher: data });
    } catch {
      return adsReply({ error: "Could not return this credit code. Try again." }, 500);
    }
  }
  if (body?.action === "issue_credit") {
    if (typeof body.requestId !== "string" || !uuidPattern.test(body.requestId) ||
      typeof body.referrerId !== "string" || !uuidPattern.test(body.referrerId) ||
      !Number.isSafeInteger(body.amountCents) || body.amountCents < 1 || body.amountCents > 999999999) {
      return adsReply({ error: "Enter a valid referrer and credit amount." }, 400);
    }
    try {
      const { data, error } = await adsDatabase().rpc("issue_referral_credit_voucher", {
        p_request_id: body.requestId, p_referrer_id: body.referrerId, p_amount_cents: body.amountCents,
      });
      if (error?.code === "P0001") return adsReply({ error: error.message }, 400);
      if (error) throw error;
      return adsReply({ voucher: data }, 201);
    } catch {
      return adsReply({ error: "Could not create the credit code. Retry with the same amount." }, 500);
    }
  }
  if (!body || typeof body !== "object" || (body.id != null &&
    (typeof body.id !== "string" || !uuidPattern.test(body.id)))) {
    return adsReply({ error: "Invalid referrer request." }, 400);
  }

  const { id, enabled } = body;
  const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!display_name || display_name.length > 80 || email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !referralCodePattern.test(code) || reservedCodes.has(code) || typeof enabled !== "boolean") {
    return adsReply({ error: "Enter a name, valid email, and a code of 3–32 letters, digits or hyphens." }, 400);
  }

  const { reward_type, reward_value, minimum_order_cents } = body;
  const hasRewardRule = ["reward_type", "reward_value", "minimum_order_cents"].some((field) => field in body);
  if (hasRewardRule && (
    !["none", "percent", "fixed"].includes(reward_type) ||
    !Number.isSafeInteger(reward_value) || !Number.isSafeInteger(minimum_order_cents) ||
    minimum_order_cents < 0 || minimum_order_cents > 999999999 ||
    (reward_type === "none" ? reward_value !== 0 || minimum_order_cents !== 0 :
      reward_value < 1 || reward_value > (reward_type === "percent" ? 10000 : 999999999))
  )) {
    return adsReply({ error: "Enter a valid reward and minimum order. A percentage must be between 0.01% and 100%." }, 400);
  }

  try {
    const db = adsDatabase();
    const seller = await findSellerCode(db, code);
    if (seller.error) throw seller.error;
    if (seller.data) return adsReply({ error: "This code is already used by a seller." }, 409);

    const existing = id
      ? await db.from("referrer_profiles").select("user_id, email").eq("id", id).maybeSingle()
      : null;
    if (existing?.error) throw existing.error;
    if (id && !existing?.data) return adsReply({ error: "Referrer not found." }, 404);
    if (existing?.data?.user_id && email !== existing.data.email) {
      return adsReply({ error: "This email is linked to the referrer's portal login." }, 409);
    }
    const table = db.from("referrer_profiles");
    const values = {
      display_name, email, code, enabled,
      ...(hasRewardRule ? { reward_type, reward_value, minimum_order_cents } : {}),
    };
    let query = id ? table.update(values).eq("id", id) : table.insert(values);
    if (id) {
      query = existing?.data?.user_id
        ? query.eq("user_id", existing.data.user_id).eq("email", existing.data.email)
        : query.is("user_id", null);
    }
    const { data, error } = await query.select(columns).maybeSingle();
    if (error?.code === "23505") return adsReply({ error: "This email or code is already in use." }, 409);
    if (error) throw error;
    if (!data) return adsReply({ error: "This referrer changed. Reload Referrals and try again." }, 409);
    return adsReply({ profile: data }, id ? 200 : 201);
  } catch {
    return adsReply({ error: "Could not save the referrer." }, 500);
  }
}

export async function DELETE(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !uuidPattern.test(id)) return adsReply({ error: "Invalid referrer." }, 400);
  try {
    const { data, error } = await adsDatabase().from("referrer_profiles")
      .delete().eq("id", id).is("user_id", null).select("id").maybeSingle();
    if (error?.code === "23503") return adsReply({ error: "Disable referrers with history instead." }, 409);
    if (error) throw error;
    if (!data) return adsReply({ error: "Referrer not found or already linked to an account." }, 409);
    return adsReply({ deleted: true });
  } catch {
    return adsReply({ error: "Could not delete the referrer." }, 500);
  }
}
