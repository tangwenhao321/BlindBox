/**
 * Optional Sentry when `EXPO_PUBLIC_SENTRY_DSN` is set and `@sentry/react-native` is installed.
 * Install: `npx expo install @sentry/react-native` then set DSN in `.env`.
 */
import Constants from "expo-constants";
import i18n from "../i18n";

let sentryReady = false;

type SentryModule = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: Error, opts?: { extra?: Record<string, string> }) => void;
  setUser: (user: { id?: string; username?: string } | null) => void;
  addBreadcrumb: (crumb: { category?: string; message?: string; level?: string; data?: Record<string, string> }) => void;
};

function loadSentry(): SentryModule | null {
  try {
    // Optional dependency — keep require so missing package does not break bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional Sentry
    return require("@sentry/react-native") as SentryModule;
  } catch {
    return null;
  }
}

export function initCrashMonitoring() {
  // Enablement: set EXPO_PUBLIC_SENTRY_DSN in EAS secrets / .env (never commit).
  // See docs/METRICS_ALERTS.md § How to enable (Mobile Sentry).
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;
  const Sentry = loadSentry();
  if (!Sentry) {
    if (__DEV__) {
      // eslint-disable-next-line no-console -- intentional diagnostics
      console.warn("[crashMonitoring] EXPO_PUBLIC_SENTRY_DSN set but @sentry/react-native is not installed");
    }
    return;
  }
  const version = Constants.expoConfig?.version ?? "1.0.0";
  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    environment: __DEV__ ? "development" : "production",
    release: `mystery-box-mobile@${version}`,
    dist: version,
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    enableAutoSessionTracking: true,
  });
  sentryReady = true;
}

export type CrashMonitoringStatus = "disabled" | "ready" | "dsn_missing_sdk";

export function getCrashMonitoringStatus(): CrashMonitoringStatus {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return "disabled";
  if (sentryReady) return "ready";
  return loadSentry() ? "disabled" : "dsn_missing_sdk";
}

export function getCrashMonitoringStatusLabel(status: CrashMonitoringStatus): string {
  if (status === "ready") return i18n.t("crashMonitoring.ready");
  if (status === "dsn_missing_sdk") return i18n.t("crashMonitoring.dsnMissingSdk");
  return i18n.t("crashMonitoring.notConfigured");
}

export function setCrashMonitoringUser(user: { id?: string | null; phone?: string | null } | null) {
  if (!sentryReady) return;
  const Sentry = loadSentry();
  if (!Sentry) return;
  if (!user?.id && !user?.phone) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id ?? undefined,
    username: user.phone ?? undefined,
  });
}

export function clearCrashMonitoringUser() {
  setCrashMonitoringUser(null);
}

export function captureException(error: Error, context?: Record<string, string>) {
  if (!sentryReady) return;
  const Sentry = loadSentry();
  if (!Sentry) return;
  Sentry.captureException(error, { extra: context });
}

export function addCrashMonitoringBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, string>,
) {
  if (!sentryReady) return;
  const Sentry = loadSentry();
  if (!Sentry?.addBreadcrumb) return;
  Sentry.addBreadcrumb({ category, message, level: "info", data });
}
