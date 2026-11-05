/** Allocate the order discount in cents, preserving the exact total in reports. */
export function allocateDiscount(lineTotals: number[], discount: number): number[] {
  const cents = lineTotals.map((value) => Math.max(0, Math.round(value * 100)));
  const total = cents.reduce((sum, value) => sum + value, 0);
  const discountCents = Math.min(total, Math.max(0, Math.round(discount * 100)));
  let cumulative = 0;
  let allocated = 0;
  return cents.map((value) => {
    cumulative += value;
    const target = total ? Math.round(discountCents * cumulative / total) : 0;
    const result = target - allocated;
    allocated = target;
    return result / 100;
  });
}
