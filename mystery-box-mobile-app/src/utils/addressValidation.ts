import { validatePhone } from "./loginValidation";
import i18n from "../i18n";
import { getAppLocale } from "./i18nLocale";

function hasRegionHint(text: string) {
  if (getAppLocale() === "vi-VN") return false;
  return /省|市|自治区|特别行政区/.test(text);
}

export function validateAddressForm(payload: {
  realName: string;
  phoneNumber: string;
  region?: string;
  district?: string;
  ward?: string;
  details: string;
  houseNumber: string;
}) {
  const name = payload.realName.trim();
  if (!name) return i18n.t("validation.recipientRequired");
  if (name.length < 2) return i18n.t("validation.recipientMin");
  const phoneError = validatePhone(payload.phoneNumber.trim());
  if (phoneError) return phoneError;
  const region = payload.region?.trim() ?? "";
  const details = payload.details.trim();
  if (!region && !hasRegionHint(details)) return i18n.t("validation.regionRequired");
  if (getAppLocale() === "vi-VN") {
    if (!payload.district?.trim()) return i18n.t("validation.districtRequired");
    if (!payload.ward?.trim()) return i18n.t("validation.wardRequired");
  }
  if (!details) return i18n.t("validation.detailsRequired");
  if (!payload.houseNumber.trim()) return i18n.t("validation.houseNumberRequired");
  return null;
}
