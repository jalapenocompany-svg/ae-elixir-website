"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SiteHeaderProps = {
  seller?: string;
  showCart?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
};

type HeaderSettings = {
  site_name: string;
  logo_url: string | null;
  contact_email: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
};

export default function SiteHeader({
  seller,
  showCart = false,
  cartCount = 0,
  onCartClick,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const [settings, setSettings] = useState<HeaderSettings | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("site_name, logo_url, contact_email, whatsapp_number, tiktok_url")
        .limit(1)
        .single();

      if (error) {
        console.error("HEADER SETTINGS ERROR:", error);
        return;
      }

      setSettings(data);
    }

    loadSettings();
  }, []);

  const shopUrl = "/";
  const siteName = settings?.site_name || "";
  const logoUrl = settings?.logo_url || "/logo.png";
  const menuLogoUrl = "/color-logo.png";
  const contactEmail = settings?.contact_email || "";
  const whatsappNumber = settings?.whatsapp_number || "";
  const tiktokUrl = settings?.tiktok_url || "";

  const cleanWhatsApp = whatsappNumber.replace(/\D/g, "");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-transparent bg-[#A79B8E]">
        <div className="flex items-center justify-between px-5 py-2">
          <a href={shopUrl} className="flex -ml-3 items-center gap-3">
            <img src={logoUrl} className="h-12 w-60 object-contain" />
            <h1 className="text-2xl font-bold text-white">{siteName}</h1>
          </a>

          <div className="flex items-center gap-1">
            {showCart && (
              <button
                type="button"
                onClick={onCartClick}
                aria-label="Open shopping cart"
                className="relative flex h-11 w-11 items-center justify-center text-white transition-transform duration-150 active:scale-95"
              >
                <svg
                  className="h-[35px] w-[35px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M7 9.5h10l-.8 9H7.8l-.8-9Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M9.5 9.5V7.6a2.5 2.5 0 0 1 5 0v1.9"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {cartCount > 0 && (
                  <span className="absolute -right-0 -top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-[#A79B8E] shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-11 w-11 items-center justify-center text-white transition-transform duration-150 active:scale-95"
            >
              <svg
                className="h-9 w-9"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 7.5h14"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />

                <path
                  d="M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />

                <path
                  d="M5 16.5h14"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-white transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Drawer Header */}
        <div className="border-b border-gray-100 px-7 py-6">
          <div className="flex items-center justify-between">
            <a href={shopUrl} className="flex items-center gap-3">
              <img
                src={menuLogoUrl}
                alt={siteName}
                className="h-10 w-auto object-contain"
              />
            </a>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-4xl font-light text-gray-400"
            >
              ×
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex h-[calc(100vh-98px)] flex-col px-7 py-8">
          <nav className="space-y-7">
            <a
              href={shopUrl}
              className="flex items-center justify-between text-[20px] font-medium tracking-wide text-gray-900"
            >
              <span>Peptides Shop</span>
              <span className="text-2xl font-light text-gray-300">›</span>
            </a>


            <a
              href="/order-lookup"
              className="flex items-center justify-between text-[20px] font-medium tracking-wide text-gray-900"
            >
              <span>Order Lookup</span>
              <span className="text-2xl font-light text-gray-300">›</span>
            </a>

            <a
              href="/peptide-calculator"
              className="flex items-center justify-between text-[20px] font-medium tracking-wide text-gray-900"
            >
              <span>Peptide Calculator</span>
              <span className="text-2xl font-light text-gray-300">›</span>
            </a>

          </nav>

          <div className="my-8 border-t border-gray-200" />

          <nav className="space-y-7">


            {showCart && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onCartClick?.();
                }}
                className="flex items-center justify-between text-[18px] font-medium tracking-wide text-gray-500"
              >
                <span>Cart</span>

              </button>
            )}
          </nav>

          {/* Bottom Contact */}
          <div className="mt-auto border-t border-gray-100 pt-6">
            <p className="mb-4 text-sm font-semibold text-gray-400">Contact Us</p>

            <div className="flex items-center gap-4">
              <a
                href={cleanWhatsApp ? `https://wa.me/${cleanWhatsApp}` : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
                title="WhatsApp"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 19l1.2-3.6A7.7 7.7 0 1 1 9 18.2L5 19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 8.5c.4 2.5 2 4 4 4.5l1.2-1.2 2 1c.3.2.4.5.3.8-.4 1.1-1.3 1.8-2.6 1.8-3.2 0-6.8-3.4-6.8-6.8 0-1.2.7-2.2 1.8-2.6.3-.1.6 0 .8.3l1 2-1.7 1.2Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>

              <a
                href={contactEmail ? `mailto:${contactEmail}` : "#"}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
                title="Email"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6h16v12H4V6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 7l8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>


            </div>
          </div>
        </div>
      </div>

    </>
  );
}