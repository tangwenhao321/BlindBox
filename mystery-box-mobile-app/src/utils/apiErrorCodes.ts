/** Backend codes that should trigger session reset / re-login. */
export const AUTH_ERROR_CODES = new Set([1001010, 1001007, 1001008]);

/** Map known API business codes to i18n keys (falls back to server msg when missing). */
export const API_ERROR_CODE_KEYS: Record<number, string> = {
  10007: "api.errors.systemError",
  1001010: "api.errors.sessionExpired",
  1001007: "api.errors.unauthorized",
  1001008: "api.errors.tokenInvalid",
};
