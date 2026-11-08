"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PROMOTIONS_ENABLED, type PromoQuote } from "@/lib/promotions";

type CartItem = { product_code: string; quantity: number; price: number };

export function useCheckoutPromotion(items: CartItem[]) {
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; quote?: PromoQuote; error?: string }>();
  const key = JSON.stringify({
    items: items.map(({ product_code, quantity, price }) => ({ product_code, quantity, price })),
    appliedCode,
    revision,
  });

  useEffect(() => {
    if (!PROMOTIONS_ENABLED || !appliedCode) return;
    const controller = new AbortController();
    const { items: requestItems } = JSON.parse(key) as { items: CartItem[] };

    async function load() {
      try {
        const { data, error } = await supabase.rpc("quote_promo_code", {
          p_code: appliedCode,
          p_items: requestItems.map(({ product_code, quantity }) => ({ product_code, quantity })),
        }).abortSignal(controller.signal);
        if (error) throw error;
        const quote = data as PromoQuote;
        const subtotal = requestItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (!quote || Math.abs(quote.subtotal - subtotal) >= 0.005) {
          throw new Error("A product price changed. Refresh your cart before checking out.");
        }
        if (!controller.signal.aborted) setResult({ key, quote });
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error && typeof error === "object" && "message" in error
            ? String(error.message) : "Could not verify this promo code.";
          setResult({ key, error: message });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [appliedCode, key]);

  const current = result?.key === key ? result : undefined;
  const checking = PROMOTIONS_ENABLED && !!appliedCode && !current;
  return {
    enabled: PROMOTIONS_ENABLED,
    codeInput,
    setCodeInput,
    appliedCode,
    quote: current?.quote,
    error: current?.error,
    checking,
    ready: !PROMOTIONS_ENABLED || !appliedCode || !!current?.quote,
    apply: () => {
      setAppliedCode(codeInput.trim().toUpperCase());
      setRevision((count) => count + 1);
    },
    remove: () => { setAppliedCode(""); setCodeInput(""); },
    refresh: () => setRevision((count) => count + 1),
  };
}
