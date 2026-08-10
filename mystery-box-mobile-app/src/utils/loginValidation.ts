import i18n from "../i18n";
import { getAppLocale } from "./i18nLocale";

export function validatePhone(phone: string) {
  const trimmed = phone.trim();
  if (getAppLocale() === "vi-VN") {
    if (!/^0\d{9}$/.test(trimmed)) {
      return i18n.t("validation.phone");
    }
    return null;
  }
  if (!/^1\d{10}$/.test(trimmed)) {
    return i18n.t("validation.phone");
  }
  return null;
}

export function validatePassword(password: string) {
  if (password.length < 6) {
    return i18n.t("validation.passwordMin");
  }
  return null;
}
