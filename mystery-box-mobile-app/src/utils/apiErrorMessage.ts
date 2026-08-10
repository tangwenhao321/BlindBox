import { ApiClientError } from "../api";
import i18n from "../i18n";
import { API_ERROR_CODE_KEYS } from "./apiErrorCodes";
import { API_ERROR_MESSAGE_PATTERNS } from "./apiErrorMessagePatterns";
import { getAppLocale } from "./i18nLocale";

function resolveMessageByPattern(message: string): string | null {
  if (getAppLocale() === "zh-CN") return null;
  for (const { pattern, key } of API_ERROR_MESSAGE_PATTERNS) {
    if (pattern.test(message) && i18n.exists(key)) return i18n.t(key);
  }
  return null;
}

function stripParenthetical(text: string): string {
  return text.replace(/（[^）]*）|\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim();
}

export function resolveApiErrorMessage(error: ApiClientError): string {
  const key = API_ERROR_CODE_KEYS[error.code];
  if (key && i18n.exists(key)) return i18n.t(key);
  const patternMsg = resolveMessageByPattern(error.message);
  if (patternMsg) return patternMsg;
  if (/系统异常/.test(error.message) && i18n.exists("api.errors.systemError")) {
    return i18n.t("api.errors.systemError");
  }
  return stripParenthetical(error.message);
}

export function parseError(error: unknown) {
  if (error instanceof ApiClientError) {
    return resolveApiErrorMessage(error);
  }
  if (error instanceof Error && error.message) {
    return stripParenthetical(error.message);
  }
  return i18n.t("api.requestRetry");
}

/** Normalize unknown errors for logging (preserves ApiClientError i18n message). */
export function toAppError(error: unknown, fallbackContext?: string): Error {
  if (error instanceof Error) return error;
  const message = parseError(error);
  return new Error(fallbackContext ? `${fallbackContext}: ${message}` : message);
}
