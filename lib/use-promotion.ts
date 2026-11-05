"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Quote = {
  code: string;
  subtotal: number;
  shipping_price: number;
  discount_amount: number;
  total: number;
  ends_at: string;
};

export function usePromotion(items: { product_code: string; quantity: number; price: number }[], shippingMethod: string) {
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState<{ quote: Quote; key: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const request = useRef(0);
  const key = JSON.stringify([items.map(({ product_code, quantity, price }) => ({ product_code, quantity, price })), shippingMethod]);
  const currentKey = useRef(key);
  useEffect(() => { currentKey.current = key; }, [key]);

  useEffect(() => {
    if (!saved || Date.parse(saved.quote.ends_at) <= now) return;
    const delay = Math.min(2_147_483_647, Math.max(1, Date.parse(saved.quote.ends_at) - Date.now()));
    const timer = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(timer);
  }, [saved, now]);

  const quote = saved && saved.key === key && Date.parse(saved.quote.ends_at) > now ? saved.quote : null;
  const notice = message || (saved && !quote ? "Your cart changed or the promotion expired. Apply the code again." : "");

  function remove() {
    request.current++;
    setSaved(null);
    setInput("");
    setMessage("");
    setBusy(false);
  }

  async function apply() {
    const code = input.trim().toUpperCase();
    if (!code || !shippingMethod || !items.length) {
      setMessage("Enter a code and select shipping before applying it.");
      return;
    }
    const id = ++request.current;
    const requestedKey = key;
    setSaved(null);
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("quote_promotion", {
        p_code: code,
        p_items: items.map(({ product_code, quantity }) => ({ product_code, quantity })),
        p_shipping_method: shippingMethod,
      });
      if (id !== request.current || currentKey.current !== requestedKey) return;
      if (error) throw new Error(error.message);
      const result = data as Quote;
      const expectedSubtotal = Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
      if (!result || !Number.isFinite(Number(result.total)) || Number(result.subtotal) !== expectedSubtotal) {
        throw new Error("Product prices changed. Refresh your cart before applying this code.");
      }
      setNow(Date.now());
      setInput(result.code);
      setSaved({ quote: result, key: requestedKey });
    } catch (error) {
      if (id === request.current) setMessage(error instanceof Error ? error.message : "Unable to validate the promotion. Please try again.");
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  return { input, setInput, quote, notice, busy, apply, remove, needsReapply: Boolean(saved && !quote) };
}
