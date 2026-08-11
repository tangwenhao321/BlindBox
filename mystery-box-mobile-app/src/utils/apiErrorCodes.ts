/** Backend codes that should trigger session reset / re-login. */
export const AUTH_ERROR_CODES = new Set([1001010, 1001007, 1001008]);

/** Map known API business codes to i18n keys (falls back to server msg when missing). */
export const API_ERROR_CODE_KEYS: Record<number, string> = {
  10007: "api.errors.systemError",
  1001010: "api.errors.sessionExpired",
  1001007: "api.errors.unauthorized",
  1001008: "api.errors.tokenInvalid",
  // MoneyPathErrorCode (backend 1002xxx)
  1002001: "api.errors.pityStockExhausted",
  1002002: "api.errors.refundDenied",
  1002003: "api.errors.refundInProgress",
  1002004: "api.errors.paymentAmountMismatch",
  1002005: "api.errors.orderOwnershipDenied",
  1002006: "api.errors.stockConflict",
};
