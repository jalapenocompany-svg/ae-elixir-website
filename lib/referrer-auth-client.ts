"use client";

import { createClient } from "@supabase/supabase-js";

// Keep referral login separate from the existing storefront session.
export const referrerAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storageKey: "ae-elixir-referrer-auth",
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
