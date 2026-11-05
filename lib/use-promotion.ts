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
  server_now: string;
};

export function usePromotion(items: { product_code: string; quantity: number; price: number }[], shippingMethod: string) {
  const [input, setInput] = useState("");
  const [saved, setSaved] = useState<{ quote: Quote; key: string; expiresAt: number } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const request = useRef(0);
  const key = JSON.stringify([items.map(({ product_code, quantity, price }) => ({ product_code, quantity, price })), shippingMethod]);
  const currentKey = useRef(key);
  useEffect(() => { currentKey.current = key; }, [key]);

  useEffect(() => {
    if (!saved || saved.expiresAt <= now) return;
    const delay = Math.min(2_147_483_647, Math.max(1, Math.ceil(saved.expiresAt - performance.now()) + 1));
    const timer = window.setTimeout(() => setNow(performance.now()), delay);
    return () => window.clearTimeout(timer);
  }, [saved, now]);

  useEffect(() => {
    const refreshClock = () => { if (!document.hidden) setNow(performance.now()); };
    window.addEventListener("focus", refreshClock);
    document.addEventListener("visibilitychange", refreshClock);
    return () => {
      window.removeEventListener("focus", refreshClock);
      document.removeEventListener("visibilitychange", refreshClock);
    };
  }, []);

  const quote = saved && saved.key === key && saved.expiresAt > now ? saved.quote : null;
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
    const started = performance.now();
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
      const remaining = Date.parse(result.ends_at) - Date.parse(result.server_now) - (performance.now() - started);
      if (!Number.isFinite(remaining)) throw new Error("Could not verify the promotion schedule. Please try again.");
      if (remaining <= 0) throw new Error("This promotion has expired. Please remove the code or try another.");
      setNow(performance.now());
      setInput(result.code);
      setSaved({ quote: result, key: requestedKey, expiresAt: performance.now() + remaining });
    } catch (error) {
      if (id === request.current) setMessage(error instanceof Error ? error.message : "Unable to validate the promotion. Please try again.");
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  return { input, setInput, quote, notice, busy, apply, remove, needsReapply: Boolean((saved || input.trim()) && !quote) };
}
