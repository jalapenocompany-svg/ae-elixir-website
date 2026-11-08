export const PROMOTIONS_ENABLED = process.env.NEXT_PUBLIC_PROMOTIONS_ENABLED === "true";
export const PROMO_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export type PromoDiscountType = "percentage" | "fixed" | "free_shipping";

export type PromoQuote = {
  code: string;
  subtotal: number;
  discount_amount: number;
  discount_type?: PromoDiscountType;
  eligible_shipping_method?: string | null;
};

export type PromoCode = {
  code: string;
  discount_type: PromoDiscountType;
  percent_off: number | null;
  fixed_amount: number | null;
  eligible_shipping_method: string | null;
  minimum_subtotal: number;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  uses: number;
};
