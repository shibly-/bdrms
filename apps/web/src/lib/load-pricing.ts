export const KG_PER_M3 = 1.8315;

export function gasPricePerKg(
  costBdt: number,
  quantityKg: number,
): number | null {
  if (!Number.isFinite(quantityKg) || quantityKg <= 0 || !Number.isFinite(costBdt)) {
    return null;
  }
  return Number((costBdt / quantityKg).toFixed(2));
}

export function gasPricePerM3(pricePerKg: number | null): number | null {
  if (pricePerKg == null) return null;
  return Number((pricePerKg * KG_PER_M3).toFixed(2));
}
