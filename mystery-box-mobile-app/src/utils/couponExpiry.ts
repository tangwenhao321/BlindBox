const MS_PER_DAY = 86_400_000;

export function parseCouponExpirationDate(item: {
  expirationDate?: string | null;
  coupon?: { expirationDate?: string | null };
}): Date | null {
  const raw = item.expirationDate ?? item.coupon?.expirationDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when coupon expires within `withinDays` (default 7). */
export function isCouponExpiringSoon(
  item: { expirationDate?: string | null; coupon?: { expirationDate?: string | null } },
  withinDays = 7,
): boolean {
  const expires = parseCouponExpirationDate(item);
  if (!expires) return false;
  const diff = expires.getTime() - Date.now();
  return diff > 0 && diff <= withinDays * MS_PER_DAY;
}

export function daysUntilCouponExpiry(
  item: { expirationDate?: string | null; coupon?: { expirationDate?: string | null } },
): number | null {
  const expires = parseCouponExpirationDate(item);
  if (!expires) return null;
  return Math.ceil((expires.getTime() - Date.now()) / MS_PER_DAY);
}
