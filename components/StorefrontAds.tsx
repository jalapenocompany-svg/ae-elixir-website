"use client";

import { useEffect, useRef, useState } from "react";

import type { PublicAd } from "@/lib/ads";
import { usePublicAds } from "@/lib/use-storefront-ads";
type Banner = PublicAd & {image:boolean;desktop:string;mobile:string;code:string};
const compactSlide = (banner: Banner | undefined) => banner?.kind === "instagram" && !(banner.image && (banner.desktop || banner.mobile));

export function AdsCarousel({ads}: {ads: PublicAd[]}) {
  const banners: Banner[] = ads.map(ad=>({...ad,image:ad.kind==="image",desktop:ad.desktop_image_url||"",mobile:ad.mobile_image_url||"",code:""}));
  const [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touch = useRef<number | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, mobile: true });
  const active = banners;
  const index = active.length ? position % active.length : 0;
  const activeKey = banners.map((banner) => banner.id).join(",");
  const standardHeight = size.width > 0 ? size.width / (size.mobile ? 4 : 20 / 3) : undefined;
  const isCompact = compactSlide(active[index]);
  const mediaHeight = isCompact ? 56 : standardHeight;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const query = window.matchMedia("(max-width: 639px)");
    const measure = (width = element.getBoundingClientRect().width) => {
      // The media area sits inside the card's two 1px borders.
      const next = { width: Math.max(0, width - 2), mobile: query.matches };
      setSize((previous) => previous.width === next.width && previous.mobile === next.mobile ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(([entry]) => { if (entry) measure(entry.contentRect.width); }) : null;
    observer?.observe(element);
    const resize = () => measure();
    query.addEventListener("change", resize);
    window.addEventListener("resize", resize);
    return () => { observer?.disconnect(); query.removeEventListener("change", resize); window.removeEventListener("resize", resize); };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || hover || reduced || active.length < 2) return;
    const timer = window.setInterval(() => setPosition((value) => value + 1), 5_000);
    return () => window.clearInterval(timer);
  }, [paused, hover, reduced, active.length, activeKey]);
  return <div ref={container} data-storefront-banner className="mx-auto w-full max-w-full min-w-0 sm:max-w-[806px]">
    {active.length > 0 && <section aria-label="Promotional announcements" aria-roledescription="carousel"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHover(false); }}
      onTouchStart={(event) => { touch.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => { if (touch.current === null) return; const delta = event.changedTouches[0].clientX - touch.current; if (Math.abs(delta) > 40) setPosition((n) => (n + (delta < 0 ? 1 : active.length - 1)) % active.length); touch.current = null; }}
      className="overflow-hidden rounded-[20px] border border-[#E6E0D8] bg-white shadow-sm">
      <div data-banner-media data-layout={isCompact ? "instagram" : "standard"}
        className={`relative w-full ${mediaHeight === undefined ? "aspect-[4/1] sm:aspect-[20/3]" : ""}`}
        style={{ height: mediaHeight, transition: reduced ? "none" : "height 400ms ease" }}>
      <div className="absolute inset-0 flex h-full items-stretch" style={{ transform: `translateX(-${index * 100}%)`, transition: reduced ? "none" : "transform 500ms ease" }}>
        {active.map((banner, i) => <div key={i} aria-hidden={index !== i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${active.length}`} className="relative flex w-full shrink-0 items-center justify-center text-center"
          style={{ height: compactSlide(banner) ? 56 : standardHeight ?? "100%" }}>
          {banner.image && (banner.desktop || banner.mobile) ? <a href={banner.link_url || undefined} target={banner.link_url ? "_blank" : undefined} rel="noopener noreferrer" tabIndex={index === i && banner.link_url ? 0 : -1} className="absolute inset-0 block h-full w-full"><picture className="block h-full w-full"><source media="(max-width: 639px)" srcSet={banner.mobile || banner.desktop} /><img src={banner.desktop || banner.mobile} alt={banner.alt_text || banner.title} className="block h-full w-full object-cover" /></picture></a>
            : banner.kind === "instagram" ? <a data-instagram-banner href={banner.link_url || undefined} target="_blank" rel="noopener noreferrer" tabIndex={index === i ? 0 : -1}
              className="flex h-full w-full items-center justify-center gap-3 px-4 text-left sm:gap-4 sm:px-5">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-7 w-7 shrink-0 text-[#A79B8E] sm:h-8 sm:w-8">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" />
                </svg>
                <div className="min-w-0"><p className="truncate text-xs font-bold leading-4 text-[#5F554C] sm:text-sm">{banner.title}</p><p className="mt-0.5 truncate text-[11px] font-normal leading-4 text-[#8F8276] sm:text-xs">{banner.message}</p></div>
              </a>
            : <div className="px-3 py-1 sm:px-5 sm:py-2"><p className="text-xs font-bold text-[#5F554C] sm:text-sm">{banner.title}</p><p className="mt-1 line-clamp-1 text-[11px] leading-4 text-[#8F8276] sm:line-clamp-none sm:text-xs">{banner.message}</p>
              {banner.link_url && <a href={banner.link_url} target="_blank" rel="noopener noreferrer" tabIndex={index === i ? 0 : -1} className="mt-1 inline-block text-[11px] font-semibold text-[#A79B8E] underline underline-offset-2">{banner.cta_label || "Learn more ↗"}</a>}</div>}
        </div>)}
      </div>
      </div>
      {active.length > 1 && <div className="flex h-6 items-center justify-center gap-1 border-t border-[#F3F0EC] bg-[#FBFAF8]">
        {active.map((_, i) => <button key={i} aria-label={`Show banner ${i + 1}`} aria-current={index === i ? "true" : undefined} onClick={() => setPosition(i)} className="flex h-6 w-6 items-center justify-center"><span className={`h-1 rounded-full ${index === i ? "w-4 bg-[#A79B8E]" : "w-1 bg-[#D8D1C8]"}`} /></button>)}
        <button aria-label={paused ? "Resume banners" : "Pause banners"} onClick={() => setPaused(!paused)} className="ml-2 flex h-6 w-6 items-center justify-center text-[#8F8276]"><svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="currentColor" aria-hidden="true">{paused ? <path d="M4 2.5 13 8 4 13.5Z" /> : <><rect x="4" y="3" width="2.5" height="10" rx=".5" /><rect x="9.5" y="3" width="2.5" height="10" rx=".5" /></>}</svg></button>
      </div>}
    </section>}
  </div>;
}

export default function PublicAds() {
  const ads=usePublicAds();
  return <div className={ads.length ? "mb-5" : ""}><AdsCarousel ads={ads}/></div>;
}
