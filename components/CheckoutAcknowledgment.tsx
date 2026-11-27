"use client";
import { useEffect, useRef, useState } from "react";
import { CHECKOUT_ACK_STATEMENTS } from "@/lib/checkout-acknowledgment";
export default function CheckoutAcknowledgment({ accepted, onAccept }: { accepted: boolean; onAccept: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [checks, setChecks] = useState([false,false,false]);
  useEffect(() => { if (!accepted) setChecks([false,false,false]); }, [accepted]);
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="mb-3 flex min-h-11 w-full items-center gap-3 rounded-2xl border border-[#D8D1C8] bg-[#FBFAF8] p-3 text-left text-sm text-[#5F554C]">
      <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#A79B8E]">{accepted ? "✓" : ""}</span>
      <span>{accepted ? "Acknowledged — review your confirmations" : "Required: review and acknowledge before placing your order"}</span>
    </button>
    <dialog ref={dialog} aria-labelledby="checkout-ack-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-[24px] border border-[#E6E0D8] bg-white p-5 text-[#5F554C] shadow-xl backdrop:bg-black/50 sm:p-6">
      <h2 id="checkout-ack-title" className="text-xl font-bold">Before you place your order</h2>
      <p className="mt-2 text-sm text-[#7F756B]">Please read and confirm each statement.</p>
      <div className="my-5 space-y-3">{CHECKOUT_ACK_STATEMENTS.map((text,i) => <label key={text} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4 text-sm leading-6">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#A79B8E]" checked={checks[i]} onChange={e => setChecks(previous => previous.map((v,index) => index === i ? e.target.checked : v))} />
        <span>{text}{i === 2 && <span className="mt-2 block"><a className="underline" href="/legal-disclaimer" target="_blank" rel="noopener noreferrer">Terms / Legal Disclaimer</a>{" · "}<a className="underline" href="/research-use-only" target="_blank" rel="noopener noreferrer">Research Compliance Policy</a></span>}</span>
      </label>)}</div>
      <div className="flex gap-3"><button type="button" onClick={() => dialog.current?.close()} className="min-h-11 flex-1 rounded-full border border-[#D8D1C8] px-4 py-2 text-sm font-semibold">Back</button>
      <button type="button" disabled={!checks.every(Boolean)} onClick={() => { onAccept(); dialog.current?.close(); }} className="min-h-11 flex-1 rounded-full bg-[#A79B8E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Confirm acknowledgments</button></div>
    </dialog>
  </>;
}
