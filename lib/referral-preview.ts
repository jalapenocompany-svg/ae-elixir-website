import "server-only";
import { adsDatabase } from "@/lib/ads-server";

export const previewEnabled = process.env.NODE_ENV === "development"
  && process.env.NEXT_PUBLIC_REFERRALS_PREVIEW_ENABLED === "true";

export const referralCodePattern = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
export const reservedCodes = new Set([
  "AEELIXIR", "ADMIN", "API", "MASTER-ADMIN", "ORDER-LOOKUP", "STRIPE-SANDBOX",
  "LEGAL-DISCLAIMER", "PEPTIDE-CALCULATOR", "RESEARCH-USE-ONLY",
  "RETURN-POLICY", "SHIPPING-POLICY", "TEST", "REFERRALS",
]);

export function findSellerCode(db: ReturnType<typeof adsDatabase>, code: string) {
  return db.from("sellers").select("seller_code").ilike("seller_code", code).limit(1).maybeSingle();
}

export async function resolveReferral(slug: string): Promise<string | undefined> {
  const code = slug.toUpperCase();
  if (!previewEnabled || !referralCodePattern.test(code) || reservedCodes.has(code)) return;
  try {
    const db = adsDatabase();
    const seller = await findSellerCode(db, code);
    if (seller.error || seller.data) return;
    const profile = await db.from("referrer_profiles").select("display_name")
      .eq("code", code).eq("enabled", true).maybeSingle();
    if (!profile.error) return profile.data?.display_name;
  } catch {
    // A referral lookup must not prevent the existing storefront from loading.
  }
}
