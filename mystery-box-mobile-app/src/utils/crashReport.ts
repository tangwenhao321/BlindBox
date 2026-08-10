import { trackEvent } from "./analytics";
import { captureException } from "./crashMonitoring";

/** Lightweight production error breadcrumb; forwards to Sentry when configured. */
export function reportAppError(error: Error, context?: string) {
  trackEvent("app_error", {
    message: error.message?.slice(0, 200) ?? "unknown",
    context: context ?? "unknown",
    name: error.name,
  });
  captureException(error, context ? { context } : undefined);
}
