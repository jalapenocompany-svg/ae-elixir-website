import { timingSafeEqual } from "node:crypto";
import { adsDatabase, adsReply } from "@/lib/ads-server";
import { PROMO_CODE_PATTERN, type PromoCode } from "@/lib/promotions";

function accessError(request: Request) {
  if (process.env.NEXT_PUBLIC_PROMOTIONS_ENABLED !== "true") {
    return adsReply({ error: "Promo codes are disabled." }, 404);
  }

  const configuredKey = process.env.PROMO_ADMIN_KEY;
  if (!configuredKey || configuredKey.length < 9) {
    return adsReply({ error: "Configure a private PROMO_ADMIN_KEY password of at least 9 characters." }, 503);
  }

  const supplied = Buffer.from(request.headers.get("x-promo-admin-key") || "");
  const expected = Buffer.from(configuredKey);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return adsReply({ error: "Incorrect promo admin password." }, 401);
  }
}

export async function GET(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;
  try {
    const db = adsDatabase();
    const [codes, shipping] = await Promise.all([
      db.from("promo_codes").select("*").order("code"),
      db.from("shipping_methods").select("name, display_label").eq("enabled", true).gt("price", 0).order("sort_order"),
    ]);
    if (codes.error || shipping.error) throw codes.error || shipping.error;
    return adsReply({ codes: codes.data, shippingMethods: shipping.data });
  } catch {
    return adsReply({ error: "Could not load promo codes. Check the migration and Supabase configuration." }, 500);
  }
}

export async function POST(request: Request) {
  const denied = accessError(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return adsReply({ error: "Invalid request." }, 400);
  const { mode, promo } = body as { mode?: string; promo?: Partial<PromoCode> };
  if (!promo || (mode !== "create" && mode !== "edit")) {
    return adsReply({ error: "Invalid request." }, 400);
  }

  const { code, discount_type = "percentage", percent_off = null, fixed_amount = null, minimum_subtotal, max_uses, enabled, starts_at, ends_at } = promo;
  const eligibleMethod = promo.eligible_shipping_method;
  if (eligibleMethod != null && (discount_type !== "free_shipping"
    || typeof eligibleMethod !== "string" || !eligibleMethod.trim())) {
    return adsReply({ error: "Choose a paid shipping method for the free-shipping code." }, 400);
  }

  const validDate = (value: unknown) => value === null
    || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
      && Number.isFinite(Date.parse(value)));
  const validAmount = (amount: unknown, max: number) =>
    typeof amount === "number" && Number.isFinite(amount) && amount >= 0.01 && amount <= max;
  const validDiscount = (
    (discount_type === "percentage" && validAmount(percent_off, 100) && fixed_amount === null)
    || (discount_type === "fixed" && percent_off === null && validAmount(fixed_amount, 9_999_999_999.99))
    || (discount_type === "free_shipping" && percent_off === null && fixed_amount === null)
  );
  if (typeof code !== "string" || !PROMO_CODE_PATTERN.test(code)
    || !validDiscount
    || typeof minimum_subtotal !== "number" || !Number.isFinite(minimum_subtotal)
    || minimum_subtotal < 0 || minimum_subtotal > 9_999_999_999.99
    || (max_uses !== null && (typeof max_uses !== "number" || !Number.isInteger(max_uses) || max_uses < 1 || max_uses > 2_147_483_647))
    || typeof enabled !== "boolean" || !validDate(starts_at) || !validDate(ends_at)
    || (starts_at && ends_at && Date.parse(ends_at) <= Date.parse(starts_at))) {
    return adsReply({ error: "Check the code, discount, minimum, usage limit, and schedule." }, 400);
  }

  const values = {
    discount_type, percent_off, fixed_amount, minimum_subtotal, max_uses, enabled, starts_at, ends_at,
    ...(discount_type === "free_shipping" && eligibleMethod === undefined
      ? {} : { eligible_shipping_method: eligibleMethod ?? null }),
  };
  try {
    const db = adsDatabase();
    if (eligibleMethod != null) {
      const { data, error } = await db.from("shipping_methods").select("name")
        .eq("name", eligibleMethod).eq("enabled", true).gt("price", 0).maybeSingle();
      if (error) throw error;
      if (!data) return adsReply({ error: "That shipping method is unavailable or free already." }, 400);
    }
    const table = db.from("promo_codes");
    const query = mode === "create" ? table.insert({ code, ...values }) : table.update(values).eq("code", code);
    const { data, error } = await query.select().maybeSingle();
    if (error?.code === "23505") return adsReply({ error: "That promo code already exists." }, 409);
    if (error?.code === "23514") return adsReply({ error: "The promo code values are outside the allowed range." }, 400);
    if (error) throw error;
    if (!data) return adsReply({ error: "Promo code not found." }, 404);
    return adsReply({ promo: data });
  } catch {
    return adsReply({ error: "Could not save this promo code." }, 500);
  }
}
