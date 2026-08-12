import { getAppLocale } from "./i18nLocale";

const LOCALE_CURRENCY: Record<string, string> = {
  "vi-VN": "VND",
  "zh-CN": "CNY",
  "en-US": "CNY",
};

let remoteCurrency: string | null = null;

function marketFallbackCurrency(): string {
  return process.env.EXPO_PUBLIC_DEFAULT_LOCALE?.trim() === "vi-VN" ? "VND" : "CNY";
}

/** Hydrate from /front/app/config when env currency is unset. */
export function setRemoteCurrency(currency: string | null | undefined) {
  const next = currency?.trim().toUpperCase() || null;
  remoteCurrency = next;
}

/** Resolve display currency from env, remote config, or locale. */
export function getAppCurrency(locale?: string): string {
  const env = process.env.EXPO_PUBLIC_CURRENCY?.trim().toUpperCase();
  if (env) return env;
  if (remoteCurrency) return remoteCurrency;
  const loc = locale ?? getAppLocale();
  if (loc === "en-US" && marketFallbackCurrency() === "VND") return "VND";
  return LOCALE_CURRENCY[loc] ?? marketFallbackCurrency();
}

function fractionDigits(currency: string) {
  return currency === "VND" ? 0 : 2;
}

/** Format amounts for the active app locale and currency. */
export function formatCurrency(amount: number, locale?: string) {
  const loc = locale ?? getAppLocale();
  const currency = getAppCurrency(loc);
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits(currency),
    maximumFractionDigits: fractionDigits(currency),
  }).format(amount);
}

/** Format optional numeric amounts; returns em dash when missing. */
export function formatCurrencyOptional(amount: number | null | undefined, locale?: string) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return formatCurrency(amount, locale);
}

/** Prefix minus for discount lines (amount is positive). */
export function formatCurrencyDiscount(amount: number, locale?: string) {
  if (!amount) return formatCurrency(0, locale);
  return `-${formatCurrency(amount, locale)}`;
}

/** Compact numeric price without currency symbol (ranges, CSV export). */
export function formatMoney(value: number, locale?: string) {
  const currency = getAppCurrency(locale);
  return currency === "VND" ? String(Math.round(value)) : value.toFixed(2);
}

/** Use with i18n keys that expect a pre-formatted currency string. */
export function formatCurrencyForI18n(amount: number, locale?: string) {
  return formatCurrency(amount, locale);
}
