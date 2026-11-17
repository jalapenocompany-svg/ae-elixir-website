import { adsDatabase, adsReply } from "@/lib/ads-server";
import { findSellerCode, previewEnabled, referralCodePattern, reservedCodes } from "@/lib/referral-preview";

const columns = "id, display_name, email, code, enabled, user_id, reward_type, reward_value, minimum_order_cents";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function authorize(request: Request) {
  if (!previewEnabled) return adsReply({ error: "Referral preview is disabled." }, 404);
  // This password-free API is available only in the explicitly enabled local development preview.
  // The custom header prevents cross-origin form requests from invoking these operations.
  if (request.headers.get("x-referral-preview") !== "true") {
    return adsReply({ error: "Open Referrals from the local admin portal." }, 403);
  }
  const origin = request.headers.get("origin");
  // Next.js can normalize request.url to localhost even when the browser uses a LAN address.
  // Host retains the address and port the browser actually requested.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (origin) {
    try {
      if (new URL(origin).host !== host.toLowerCase()) {
        return adsReply({ error: "Use the same local site to manage referrers." }, 403);
      }
    } catch {
      return adsReply({ error: "Invalid request origin." }, 403);
    }
  }
}

export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const db = adsDatabase();
    const [profiles, overview] = await Promise.all([
      db.from("referrer_profiles").select(columns).order("display_name"),
      db.rpc("referral_sales_overview"),
    ]);
    if (profiles.error) throw profiles.error;
    return adsReply({ profiles: profiles.data, overview: overview.error ? null : overview.data });
  } catch {
    return adsReply({ error: "Could not load referrers. Check that the preview migration was applied." }, 500);
  }
}

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
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

    const table = db.from("referrer_profiles");
    const values = {
      display_name, email, code, enabled,
      ...(hasRewardRule ? { reward_type, reward_value, minimum_order_cents } : {}),
    };
    const query = id ? table.update(values).eq("id", id).is("user_id", null) : table.insert(values);
    const { data, error } = await query.select(columns).maybeSingle();
    if (error?.code === "23505") return adsReply({ error: "This email or code is already in use." }, 409);
    if (error) throw error;
    if (!data) return adsReply({ error: "Referrer not found or already linked to an account." }, 409);
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
