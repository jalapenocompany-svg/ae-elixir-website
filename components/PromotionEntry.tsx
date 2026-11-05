"use client";

import type { usePromotion } from "@/lib/use-promotion";

export default function PromotionEntry({ promotion }: { promotion: ReturnType<typeof usePromotion> }) {
  return <div className="mb-4 border-b border-[#E6E0D8] pb-4">
    <label htmlFor="promotion-code" className="mb-2 block text-sm font-semibold text-[#5F554C]">Promotion code</label>
    <div className="flex gap-2">
      <input id="promotion-code" maxLength={32} autoCapitalize="characters" autoComplete="off"
        value={promotion.input} disabled={promotion.busy}
        onChange={(event) => { promotion.remove(); promotion.setInput(event.target.value); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void promotion.apply(); } }}
        className="min-w-0 flex-1 rounded-xl border border-[#D8D1C8] bg-white px-3 py-2 text-sm uppercase" />
      <button type="button" disabled={promotion.busy} onClick={() => void promotion.apply()}
        className="rounded-xl bg-[#A79B8E] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {promotion.busy ? "Checking…" : "Apply"}
      </button>
      {promotion.quote && <button type="button" onClick={promotion.remove} className="text-sm text-[#6F655C] underline">Remove</button>}
    </div>
    <p aria-live="polite" className="mt-2 text-sm text-[#6F655C]">
      {promotion.notice || (promotion.quote ? `${promotion.quote.code} applied. Shipping is excluded from the discount.` : "Discounts apply to merchandise only.")}
    </p>
  </div>;
}
