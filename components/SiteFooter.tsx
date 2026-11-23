"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import ContactLinks from "@/components/ContactLinks";

type FooterSettings = {
  site_name: string;
  contact_email: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
  tiktok_profile_url?: string | null;
  footer_text: string | null;
};

const SITE_SETTINGS_EVENT = "ae-site-settings-updated";

export default function SiteFooter() {
  const [settings, setSettings] = useState<FooterSettings | null>(null);

  async function loadSettings() {
    let { data, error } = await supabase
      .from("site_settings")
      .select(
        "site_name, contact_email, whatsapp_number, tiktok_url, tiktok_profile_url, footer_text"
      )
      .limit(1)
      .single();

    if (error && ["42703", "PGRST204"].includes(error.code)) {
      const legacy = await supabase.from("site_settings")
        .select("site_name, contact_email, whatsapp_number, tiktok_url, footer_text").limit(1).single();
      data = legacy.data ? { ...legacy.data, tiktok_profile_url: null } : null;
      error = legacy.error;
    }

    if (error) {
      console.error("FOOTER SETTINGS LOAD ERROR:", error);
      return;
    }

    if (data) {
      setSettings(data);
    }
  }

  useEffect(() => {
    loadSettings();

    window.addEventListener(SITE_SETTINGS_EVENT, loadSettings);

    return () => {
      window.removeEventListener(SITE_SETTINGS_EVENT, loadSettings);
    };
  }, []);

  const cleanWhatsApp = (settings?.whatsapp_number || "").replace(/\D/g, "");
  const contactEmail = (settings?.contact_email || "").trim();
  const instagramUrl = (settings?.tiktok_url || "").trim();

  const hasWhatsApp = cleanWhatsApp.length > 0;
  const hasEmail = contactEmail.length > 0;
  const hasInstagram = instagramUrl.length > 0;
  const tiktokUrl = (settings?.tiktok_profile_url || "").trim();
  const hasTikTok = tiktokUrl.length > 0;

  return (
    <footer className="border-t border-gray-100 px-6 py-10">
      <div className="mx-auto max-w-xl text-center">
        {(hasWhatsApp || hasEmail || hasInstagram || hasTikTok) && (
          <>
            <p className="mb-4 text-sm font-semibold text-gray-400">
              Contact Us
            </p>

            <div className="mb-6">
              <ContactLinks email={contactEmail} whatsapp={cleanWhatsApp} instagram={instagramUrl} tiktok={tiktokUrl} centered />
            </div>
          </>
        )}

        <div className="mb-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          <Link
            href="/research-use-only"
            className="font-medium text-[#8F8276] transition hover:text-[#5F554C] hover:underline"
          >
            Research Use Only
          </Link>

          <span className="hidden text-[#D8D1C8] sm:inline" aria-hidden="true">
            •
          </span>

          <Link
            href="/legal-disclaimer"
            className="font-medium text-[#8F8276] transition hover:text-[#5F554C] hover:underline"
          >
            Legal Disclaimer
          </Link>

          <span className="hidden text-[#D8D1C8] sm:inline" aria-hidden="true">
            •
          </span>

          <Link
            href="/shipping-policy"
            className="font-medium text-[#8F8276] transition hover:text-[#5F554C] hover:underline"
          >
            Shipping Policy
          </Link>

          <span className="hidden text-[#D8D1C8] sm:inline" aria-hidden="true">
            •
          </span>

          <Link
            href="/return-policy"
            className="font-medium text-[#8F8276] transition hover:text-[#5F554C] hover:underline"
          >
            Return Policy
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          {settings?.footer_text ||
            `© ${new Date().getFullYear()} ${settings?.site_name || "AE Elixir"
            }. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}