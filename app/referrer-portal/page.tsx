import { notFound } from "next/navigation";
import ReferrerPortal from "@/components/ReferrerPortal";
import { previewEnabled } from "@/lib/referral-preview";

export default function ReferrerPortalPage() {
  if (!previewEnabled) notFound();
  return <ReferrerPortal />;
}
