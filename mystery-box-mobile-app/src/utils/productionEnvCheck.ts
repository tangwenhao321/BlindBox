import { getPaymentMode } from "../config/payment";
import i18n from "../i18n";

export function getProductionEnvWarnings(): string[] {
  if (__DEV__) return [];

  const warnings: string[] = [];
  if (!process.env.EXPO_PUBLIC_API_BASE_URL?.trim()) {
    warnings.push(i18n.t("productionEnv.apiMissing"));
  }
  if (getPaymentMode() === "mock") {
    warnings.push(i18n.t("productionEnv.mockPaymentMode"));
  }
  if (process.env.EXPO_PUBLIC_MOCK_PAYMENT === "true") {
    warnings.push(i18n.t("productionEnv.mockPaymentFlag"));
  }
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (sentryDsn) {
    try {
      require.resolve("@sentry/react-native");
    } catch {
      warnings.push(i18n.t("productionEnv.sentrySdkMissing"));
    }
  }
  return warnings;
}
