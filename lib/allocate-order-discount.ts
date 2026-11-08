// Round the cumulative share so every cent is allocated and zero-price lines get zero.
export function allocateOrderDiscount(lineAmounts: number[], discountAmount: number): number[] {
  const weights = lineAmounts.map((amount) => Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const discountCents = Number.isFinite(discountAmount) ? Math.max(0, Math.round(discountAmount * 100)) : 0;
  if (!totalWeight || !discountCents) return weights.map(() => 0);

  let cumulativeWeight = 0;
  let allocatedCents = 0;
  return weights.map((weight) => {
    cumulativeWeight += weight;
    const nextCents = Math.round(discountCents * (cumulativeWeight / totalWeight));
    const lineDiscount = nextCents - allocatedCents;
    allocatedCents = nextCents;
    return lineDiscount / 100;
  });
}
