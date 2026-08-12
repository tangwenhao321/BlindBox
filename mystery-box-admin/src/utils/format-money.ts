/**
 * Admin money display — mirrors mobile VND/CNY rules without Expo deps.
 * Prefer VITE_CURRENCY; else VITE_MARKET=vn → VND; else CNY.
 */
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
