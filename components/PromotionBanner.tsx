"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Banner = { code: string; banner_text: string; ends_at: string };

export default function PromotionBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    async function refresh() {
      const id = ++sequence;
      try {
        const { data, error } = await supabase.rpc("active_storefront_promotions");
        if (active && id === sequence) { setNow(Date.now()); setBanners(error ? [] : data || []); }
      } catch {
        if (active && id === sequence) setBanners([]);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const visible = banners.filter((banner) => Date.parse(banner.ends_at) > now);
  if (!visible.length) return null;
  return <aside aria-label="Store promotions" className="border-b border-[#E6E0D8] bg-[#F6F3EF] px-5 py-3 text-center text-sm text-[#5F554C]">
    {visible.map((banner) => <p key={banner.code}>{banner.banner_text}</p>)}
  </aside>;
}
