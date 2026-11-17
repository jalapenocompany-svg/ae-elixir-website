import { resolveReferral } from "@/lib/referral-preview";
import ShopClient from "./ShopClient";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ seller: string }>;
}) {
  const { seller } = await params;

  const referredBy = await resolveReferral(seller);
  return referredBy ? <ShopClient referredBy={referredBy} referralCode={seller.toUpperCase()} /> : <ShopClient seller={seller} />;
}