"use client";

import { useEffect, useState } from "react";

type AgeGateStatus = "checking" | "allowed" | "ask" | "forbidden";

const AGE_GATE_KEY = "ae_elixir_age_confirmed";

export default function AgeGate() {
  const [status, setStatus] = useState<AgeGateStatus>("checking");

  useEffect(() => {
    const confirmed = localStorage.getItem(AGE_GATE_KEY);

    if (confirmed === "yes") {
      setStatus("allowed");
    } else {
      setStatus("ask");
    }
  }, []);

  function handleYes() {
    localStorage.setItem(AGE_GATE_KEY, "yes");
    setStatus("allowed");
  }

  function handleNo() {
    setStatus("forbidden");
  }

  if (status === "checking" || status === "allowed") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      {status === "ask" && (
        <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-[#E6E0D8] bg-white shadow-2xl">
          <div className="bg-[#FBFAF8] px-6 pt-6">
            <img
              src="/age-21.png"
              alt="Age verification"
              className="mx-auto w-full max-w-md object-contain"
            />
          </div>

          <div className="px-6 pb-7 pt-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A79B8E]">
              Age Verification
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#1F1A17]">
              Are you over 21?
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#6F655C]">
              You must be 21 years of age or older to view this website.
              Please verify your age to continue.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleYes}
                className="rounded-full bg-[#A79B8E] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95"
              >
                I am 21 or older
              </button>

              <button
                type="button"
                onClick={handleNo}
                className="rounded-full border border-[#D8D1C8] bg-white px-5 py-3 text-sm font-bold text-[#7F756B] shadow-sm transition-all hover:bg-[#F8F5F1] active:scale-95"
              >
                I am under 21
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "forbidden" && (
        <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-red-100 bg-white shadow-2xl">
          <div className="bg-[#FFF7F7] px-6 pt-6">
            <img
              src="/age-forbidden.png"
              alt="Access forbidden"
              className="mx-auto w-full max-w-md object-contain"
            />
          </div>

          <div className="px-6 pb-7 pt-4 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">
              Access Restricted
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#1F1A17]">
              Access forbidden
            </h2>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#6F655C]">
              Your access is restricted because of your age. Please refresh the
              page if you need to verify again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}