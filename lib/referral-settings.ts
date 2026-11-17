// Public feature switch. The legacy preview switch remains local-only.
export const REFERRALS_ENABLED =
  process.env.NEXT_PUBLIC_REFERRALS_ENABLED === "true" ||
  (process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_REFERRALS_PREVIEW_ENABLED === "true");
