/** Carrier-specific tracking links shared by the admin, lookup page and emails. */
export type TrackingCarrier = "ups" | "usps";

/** Remove spacing sometimes added when pasting a tracking number. */
export function cleanTrackingNumber(value: string): string {
  return String(value || "").trim().replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Best-effort detection only. Numeric UPS formats can overlap with USPS,
 * so staff can override the detected value using the admin dropdown.
 */
export function detectTrackingCarrier(value: string): TrackingCarrier | null {
  const number = cleanTrackingNumber(value);

  // Standard UPS tracking IDs contain 1Z followed by 16 letters/digits.
  if (/^1Z[A-Z0-9]{16}$/.test(number)) return "ups";

  // Common USPS domestic (9...) and international IDs ending in US.
  if (/^9\d{19,21}$/.test(number) || /^[A-Z]{2}\d{9}US$/.test(number)) {
    return "usps";
  }

  return null;
}

export function getTrackingCarrier(
  trackingNumber: string,
  storedCarrier?: string | null
): TrackingCarrier | null {
  if (storedCarrier === "ups" || storedCarrier === "usps") return storedCarrier;
  return detectTrackingCarrier(trackingNumber);
}

/** Null means a carrier needs to be selected before creating a tracking link. */
export function getTrackingUrl(
  trackingNumber: string,
  storedCarrier?: string | null
): string | null {
  const number = cleanTrackingNumber(trackingNumber);
  const carrier = getTrackingCarrier(number, storedCarrier);
  if (!number || !carrier) return null;

  if (carrier === "ups") {
    return `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(number)}`;
  }
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(number)}`;
}
