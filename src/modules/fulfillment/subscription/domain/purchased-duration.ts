export function purchasedDays(durationDays: number, quantity: number): bigint {
  return BigInt(durationDays) * BigInt(quantity);
}
