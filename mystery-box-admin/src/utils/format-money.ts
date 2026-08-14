/**
 * Admin money display — mirrors mobile VND/CNY rules without Expo deps.
 * Prefer VITE_CURRENCY; else VITE_MARKET=vn → VND; else CNY.
 */

/** Matches backend default `app.marketplace.fee-rate` (5%). */
export const MARKETPLACE_PLATFORM_FEE_RATE = 0.05

export function getAdminCurrency(): string {
  const env = String(import.meta.env.VITE_CURRENCY || '')
    .trim()
    .toUpperCase()
  if (env) return env
  if (import.meta.env.VITE_MARKET === 'vn') return 'VND'
  return 'CNY'
}

export function formatAdminMoney(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '—'
  const n = typeof amount === 'number' ? amount : Number(amount)
  if (Number.isNaN(n)) return '—'
  const currency = getAdminCurrency()
  if (currency === 'VND') {
    return `${Math.round(n).toLocaleString('vi-VN')} ₫`
  }
  return `¥${n.toFixed(2)}`
}

/** Net proceeds after platform fee, rounded per admin currency (VND = integer ₫). */
export function estimateMarketplaceNetProceeds(listPrice: number, feeRate?: number): number {
  const price = Number(listPrice)
  if (!Number.isFinite(price) || price <= 0) return 0
  const rate =
    feeRate != null && Number.isFinite(feeRate) && feeRate >= 0
      ? feeRate
      : MARKETPLACE_PLATFORM_FEE_RATE
  const raw = price * (1 - rate)
  return getAdminCurrency() === 'VND' ? Math.round(raw) : Math.round(raw * 100) / 100
}
