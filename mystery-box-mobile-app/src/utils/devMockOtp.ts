import i18n from "../i18n";
import { ApiClientError } from "../api";

const BLOCKED_MOCK_CODE = "000000";

/** Dev-only mock OTP from EXPO_PUBLIC_DEV_MOCK_OTP (never used in production builds). */
export function getDevMockOtp(): string | undefined {
  if (!__DEV__) return undefined;
  const value = process.env.EXPO_PUBLIC_DEV_MOCK_OTP?.trim();
  return value || undefined;
}

export function assertProductionOtpAllowed(code: string) {
  if (__DEV__) return;
  if (code.trim() === BLOCKED_MOCK_CODE) {
    throw new ApiClientError(i18n.t("auth.mockOtpBlocked"));
  }
}

export function resolveSmsCode(userCode: string | undefined): string {
  const trimmed = userCode?.trim();
  if (trimmed) {
    assertProductionOtpAllowed(trimmed);
    return trimmed;
  }
  const mock = getDevMockOtp();
  if (mock) {
    assertProductionOtpAllowed(mock);
    return mock;
  }
  throw new ApiClientError(i18n.t("auth.codeRequired"));
}
