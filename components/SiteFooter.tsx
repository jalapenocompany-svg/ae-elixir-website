"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FooterSettings = {
  site_name: string;
  contact_email: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
  footer_text: string | null;
};

export default function SiteFooter() {
  const [settings, setSettings] = useState<FooterSettings | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from("site_settings")
        .select(
          "site_name, contact_email, whatsapp_number, tiktok_url, footer_text"
        )
        .limit(1)
        .single();

      if (data) {
        setSettings(data);
      }
    }

    loadSettings();
  }, []);

  const cleanWhatsApp = (
    settings?.whatsapp_number || ""
  ).replace(/\D/g, "");

  return (
    <footer className="border-t border-gray-100 px-6 py-10">
      <div className="mx-auto max-w-xl text-center">
        <p className="mb-4 text-sm font-semibold text-gray-400">
          Contact Us
        </p>

        <div className="mb-6 flex justify-center gap-5">
          <a
            href={cleanWhatsApp ? `https://wa.me/${cleanWhatsApp}` : "#"}
            target="_blank"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 19l1.2-3.6A7.7 7.7 0 1 1 9 18.2L5 19Z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </a>

          <a
            href={
              settings?.contact_email
                ? `mailto:${settings.contact_email}`
                : "#"
            }
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16v12H4V6Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M4 7l8 6 8-6"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </a>

          <a
            href={settings?.tiktok_url || "#"}
            target="_blank"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 4v9.2a4.2 4.2 0 1 1-4.2-4.2"
                stroke="currentColor"
                strokeWidth="2.2"
              />
              <path
                d="M14 4c.6 2.8 2.4 4.6 5 5"
                stroke="currentColor"
                strokeWidth="2.2"
              />
            </svg>
          </a>
        </div>

        <p className="text-xs text-gray-400">
          {settings?.footer_text ||
            `© ${new Date().getFullYear()} ${
              settings?.site_name || "Peptide Shop"
            }. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}