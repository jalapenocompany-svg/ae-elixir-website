import type { ReactNode } from "react";

type ContactLinksProps = {
  email?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  centered?: boolean;
};

function socialUrl(value?: string | null) {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "";
  } catch { return ""; }
}

export default function ContactLinks({ email, whatsapp, instagram, tiktok, centered = false }: ContactLinksProps) {
  const number = (whatsapp || "").replace(/\D/g, "");
  const address = (email || "").trim();
  const instagramUrl = socialUrl(instagram);
  const tiktokUrl = socialUrl(tiktok);
  const icon = (children: ReactNode) => <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
  const links = [
    { label: "Contact us on WhatsApp", title: "WhatsApp", href: number ? "https://wa.me/" + number : "",
      graphic: icon(<><path d="M5 19l1.2-3.6A7.7 7.7 0 1 1 9 18.2L5 19Z" /><path d="M9.5 8.5c.4 2.5 2 4 4 4.5l1.2-1.2 2 1c.3.2.4.5.3.8-.4 1.1-1.3 1.8-2.6 1.8-3.2 0-6.8-3.4-6.8-6.8 0-1.2.7-2.2 1.8-2.6.3-.1.6 0 .8.3l1 2-1.7 1.2Z" /></>) },
    { label: "Email us", title: "Email", href: address ? "mailto:" + address : "",
      graphic: icon(<><path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" /></>) },
    { label: "Visit our Instagram", title: "Instagram", href: instagramUrl,
      graphic: icon(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" /></>) },
    { label: "Visit our TikTok", title: "TikTok", href: tiktokUrl,
      graphic: icon(<path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47V14a2 2 0 1 0 1.5 1.94V3H14Zm0 0c.4 2.8 2.1 4.6 5 5v2.5a8.4 8.4 0 0 1-5-2" />) },
  ].filter(link => link.href);
  if (!links.length) return null;
  return <div className={"flex flex-wrap items-center gap-4" + (centered ? " justify-center" : "")}>
    {links.map(link => <a key={link.title} href={link.href} title={link.title} aria-label={link.label}
      {...(link.title !== "Email" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A79B8E] active:scale-95">
      {link.graphic}
    </a>)}
  </div>;
}
