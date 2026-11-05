"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PROMOTIONS_ENABLED } from "@/lib/promotion-settings";

type Banner = { code: string; banner_text: string; ends_at: string };

export default function PromotionBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    if (!PROMOTIONS_ENABLED) return;
    let live = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;

    async function refresh() {
      const current = ++generation;
      clearTimeout(refreshTimer);
      const started = performance.now();
      try {
        const { data, error } = await supabase.rpc("storefront_promotion_schedule");
        if (!live || current !== generation) return;
        if (error || !data || !Array.isArray(data.promotions)) throw new Error("Promotion banners unavailable");
        const serverNow = Date.parse(data.server_now);
        if (!Number.isFinite(serverNow)) throw new Error("Invalid promotion clock");
        const elapsed = performance.now() - started;
        const promotions: Banner[] = data.promotions.filter((banner: Banner) => Date.parse(banner.ends_at) > serverNow + elapsed);
        setBanners(promotions);
        clearTimeout(expiryTimer);
        const receivedAt = performance.now();
        function expireBanners() {
          if (!live) return;
          const clock = serverNow + elapsed + performance.now() - receivedAt;
          const remaining = promotions.filter((banner) => Date.parse(banner.ends_at) > clock);
          setBanners(remaining);
          if (remaining.length) {
            const delay = Math.ceil(Math.min(...remaining.map((banner) => Date.parse(banner.ends_at))) - clock) + 1;
            expiryTimer = setTimeout(expireBanners, Math.min(2_147_483_647, Math.max(1, delay)));
          }
        }
        // Each cached banner expires even if all later requests fail.
        expireBanners();
        const transition = Date.parse(data.next_change_at);
        const delay = Number.isFinite(transition) ? transition - serverNow - elapsed + 25 : 60_000;
        refreshTimer = setTimeout(refresh, Math.max(100, Math.min(60_000, delay)));
      } catch {
        if (live && current === generation) refreshTimer = setTimeout(refresh, 30_000);
      }
    }
    const onFocus = () => { if (!document.hidden) void refresh(); };
    void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      live = false; generation++;
      clearTimeout(refreshTimer); clearTimeout(expiryTimer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  if (!PROMOTIONS_ENABLED || !banners.length) return null;
  return (
    <aside aria-label="Current promotions" className="border-b border-[#D8D1C8] bg-[#F3EEE7] px-5 py-3 text-center text-sm text-[#5F554C]">
      {banners.map((banner) => <p key={banner.code} className="mx-auto max-w-4xl leading-6">{banner.banner_text}</p>)}
    </aside>
  );
}
