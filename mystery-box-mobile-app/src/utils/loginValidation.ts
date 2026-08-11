import i18n from "../i18n";
import { getAppLocale } from "./i18nLocale";

/** Strip spaces/dashes; map +84 / 84… to 0… for VN. */
export function normalizePhoneInput(phone: string): string {
  let trimmed = phone.trim().replace(/[\s-]/g, "");
  if (getAppLocale() === "vi-VN") {
    if (trimmed.startsWith("+84")) {
      trimmed = `0${trimmed.slice(3)}`;
    } else if (trimmed.startsWith("84") && trimmed.length >= 11) {
      trimmed = `0${trimmed.slice(2)}`;
    }
  }
  return trimmed;
}

export function validatePhone(phone: string) {
  const trimmed = normalizePhoneInput(phone);
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

/** Peer-app style register/reset: 8+ with letter and digit (aligns with backend). Login stays ≥6 for legacy accounts. */
export function validatePassword(password: string, mode: "login" | "register" = "register") {
  if (mode === "login") {
    if (password.length < 6) {
      return i18n.t("validation.passwordMinLogin");
    }
    return null;
  }
  if (password.length < 8) {
    return i18n.t("validation.passwordMin");
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return i18n.t("validation.passwordComplexity");
  }
  return null;
}

export type PasswordStrength = "weak" | "fair" | "strong";

export function passwordStrength(password: string): PasswordStrength {
  if (!password || password.length < 8) return "weak";
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  return "strong";
}
