"use client";

import { useEffect, useState } from "react";

type Props = {
  createdAt: string;
  dueAt: string | null | undefined;
  reminderSentAt?: string | null;
  paymentStatus: string | null;
  orderStatus: string | null;
  compact?: boolean;
};

function formatRemaining(remainingMs: number): string {
  const minutes = Math.ceil(Math.max(0, remainingMs) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export default function UnpaidOrderCountdown({
  createdAt,
  dueAt,
  reminderSentAt = null,
  paymentStatus,
  orderStatus,
  compact = false,
}: Props) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  // Only display for unpaid, still-pending orders explicitly enrolled in automation.
  if (
    !dueAt ||
    paymentStatus?.trim().toLowerCase() !== "pending" ||
    orderStatus?.trim().toLowerCase() !== "pending"
  ) {
    return null;
  }

  const startMs = Date.parse(createdAt);
  const dueMs = Date.parse(dueAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(dueMs) || dueMs <= startMs) {
    return null;
  }

  const remainingMs = nowMs === null ? null : dueMs - nowMs;
  const expired = remainingMs !== null && remainingMs <= 0;
  const progress = nowMs === null
    ? 0
    : Math.max(0, Math.min(100, ((nowMs - startMs) / (dueMs - startMs)) * 100));

  const reminderDue = nowMs !== null && nowMs >= startMs + 24 * 60 * 60 * 1000;
  const reminderMessage = expired
    ? "Payment deadline passed. Awaiting the next scheduled cancellation check."
    : reminderSentAt
      ? "Payment reminder sent."
      : reminderDue
        ? "Payment reminder pending the next daily check."
        : "Payment reminder scheduled after 24 hours.";

  const deadlineLabel = new Date(dueMs).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <section
      aria-label="Unpaid order payment deadline"
      className={`rounded-[20px] border border-[#E6E0D8] bg-[#FBFAF8] shadow-sm ${compact ? "mb-3 p-3.5" : "mb-5 p-4"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#8F8276]">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Payment Pending
          </div>
          <p className="mt-1 text-xs text-[#8F8276]">48-hour payment window</p>
        </div>
        <div className="text-left sm:text-right">
          <p className={`${compact ? "text-base" : "text-lg"} font-bold text-[#5F554C]`}>
            {expired ? "Deadline reached" : remainingMs === null ? "Calculating..." : formatRemaining(remainingMs)}
          </p>
          <p className="text-xs text-[#8F8276]">Deadline: {deadlineLabel}</p>
        </div>
      </div>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ECE7E2]"
        role="progressbar"
        aria-label="Payment window elapsed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div
          className="h-full rounded-full bg-[#A79B8E] transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-[#7C7065]">{reminderMessage}</p>
    </section>
  );
}
