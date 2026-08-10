import type { TFunction } from "i18next";

const KNOWN_CARRIER_KEYS: Record<string, string> = {
  SF: "orderDetails.carrierSf",
  YTO: "orderDetails.carrierYto",
  ZTO: "orderDetails.carrierZto",
  STO: "orderDetails.carrierSto",
  YD: "orderDetails.carrierYd",
  HTKY: "orderDetails.carrierHtky",
  JD: "orderDetails.carrierJd",
  EMS: "orderDetails.carrierEms",
};

export function resolveCarrierLabel(code: string | null | undefined, t: TFunction): string | null {
  if (!code?.trim()) return null;
  const normalized = code.trim().toUpperCase();
  const key = KNOWN_CARRIER_KEYS[normalized];
  if (key) return t(key);
  return code.trim();
}
