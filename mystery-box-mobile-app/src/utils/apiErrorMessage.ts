import { ApiClientError } from "../api";
import i18n from "../i18n";
import { API_ERROR_CODE_KEYS } from "./apiErrorCodes";
import { API_ERROR_MESSAGE_PATTERNS, API_ERROR_TOKEN_PATTERNS } from "./apiErrorMessagePatterns";
import { getAppLocale } from "./i18nLocale";

function resolveByPatterns(
  message: string,
  patterns: readonly { pattern: RegExp; key: string }[],
): string | null {
  for (const { pattern, key } of patterns) {
    if (pattern.test(message) && i18n.exists(key)) return i18n.t(key);
  }
  return null;
}

function resolveMessageByPattern(message: string): string | null {
  // Token / machine codes apply in every locale (including zh-CN).
  const tokenMsg = resolveByPatterns(message, API_ERROR_TOKEN_PATTERNS);
  if (tokenMsg) return tokenMsg;
  if (getAppLocale() === "zh-CN") return null;
  return resolveByPatterns(message, API_ERROR_MESSAGE_PATTERNS);
}

function stripParenthetical(text: string): string {
  return text.replace(/（[^）]*）|\([^)]*\)/g, "").replace(/\s{2,}/g, " ").trim();
}

export function resolveApiErrorMessage(error: ApiClientError): string {
  const key = API_ERROR_CODE_KEYS[error.code];
  if (key && i18n.exists(key)) return i18n.t(key);
  if (error.errorCode) {
    const byErrorCode = resolveByPatterns(error.errorCode, API_ERROR_TOKEN_PATTERNS);
    if (byErrorCode) return byErrorCode;
  }
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
    const tokenMsg = resolveByPatterns(error.message, API_ERROR_TOKEN_PATTERNS);
    if (tokenMsg) return tokenMsg;
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
