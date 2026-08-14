import { resolvePaymentMode } from "../config/payment";
import i18n from "../i18n";

function isPlaceholderUrl(raw?: string | null): boolean {
  const v = raw?.trim() ?? "";
  if (!v) return true;
  return /example\.com|your-domain|localhost/i.test(v);
}

function isBlank(raw?: string | null): boolean {
  return !(raw?.trim());
}

export function getProductionEnvWarnings(): string[] {
  if (__DEV__) return [];

  const warnings: string[] = [];
  if (!process.env.EXPO_PUBLIC_API_BASE_URL?.trim()) {
    warnings.push(i18n.t("productionEnv.apiMissing"));
  } else if (/localhost|127\.0\.0\.1|example\.com|your-domain/i.test(process.env.EXPO_PUBLIC_API_BASE_URL)) {
    warnings.push(i18n.t("productionEnv.apiMissing"));
  }
  if (resolvePaymentMode() === "mock") {
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
  if (isPlaceholderUrl(process.env.EXPO_PUBLIC_PRIVACY_URL)) {
    warnings.push(i18n.t("productionEnv.privacyUrlMissing"));
  }
  if (isPlaceholderUrl(process.env.EXPO_PUBLIC_TERMS_URL)) {
    warnings.push(i18n.t("productionEnv.termsUrlMissing"));
  }
  if (isPlaceholderUrl(process.env.EXPO_PUBLIC_APP_LINK_DOMAIN)) {
    warnings.push(i18n.t("productionEnv.appLinkDomainMissing"));
  }
  if (isPlaceholderUrl(process.env.EXPO_PUBLIC_MINOR_DECLARATION_URL)) {
    warnings.push(i18n.t("productionEnv.minorDeclarationUrlMissing"));
  }
  if (isPlaceholderUrl(process.env.EXPO_PUBLIC_IOS_APP_STORE_URL)) {
    warnings.push(i18n.t("productionEnv.iosAppStoreUrlMissing"));
  }
  if (isBlank(process.env.EXPO_PUBLIC_SUPPORT_PHONE) && isBlank(process.env.EXPO_PUBLIC_SUPPORT_EMAIL)) {
    warnings.push(i18n.t("productionEnv.supportContactMissing"));
  }
  return warnings;
}
