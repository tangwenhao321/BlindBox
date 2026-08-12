import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { parseError, setOnUnauthorized } from "../api";
import i18n from "../i18n";
import { ORDER_REFRESH_INTERVAL_MS } from "../config/constants";
import { uploadAnalyticsEvents, uploadGuestAnalyticsEvents } from "../services/analyticsService";
import {
  drainEvents,
  hydrateAnalyticsQueue,
  markAnalyticsUploadError,
  requeueEvents,
  trackEvent,
} from "../utils/analytics";
import { getProductionEnvWarnings } from "../utils/productionEnvCheck";
import {
  authenticateBiometricUnlock,
  getBiometricUnlockEnabled,
  isBiometricUnlockAvailable,
} from "../utils/biometricUnlock";
import { toast } from "../utils/toast";

type Params = {
  token: string;
  loading: boolean;
  setLoading: (value: boolean) => void;
  restoreToken: () => Promise<string | null>;
  onRestoreSuccess: (token: string) => Promise<void>;
  onRestoreFail: () => Promise<void>;
  onUnauthorized: () => void | Promise<void>;
  view: string;
  selectedOrder: unknown;
  autoRefreshOrders: boolean;
  loadOrders: (token: string) => Promise<void>;
};

export function useAppBootstrap(params: Params) {
  const {
    token,
    loading,
    setLoading,
    restoreToken,
    onRestoreSuccess,
    onRestoreFail,
    onUnauthorized,
    view,
    selectedOrder,
    autoRefreshOrders,
    loadOrders,
  } = params;
  const analyticsRetryMsRef = useRef(12000);
  const orderPollErrShownRef = useRef(false);

  useEffect(() => {
    const restore = async () => {
      const savedToken = await restoreToken();
      // Hide splash as soon as token restore finishes; home catalog can continue in background.
      setLoading(false);
      if (!savedToken) return;
      try {
        const bioEnabled = await getBiometricUnlockEnabled();
        const bioAvailable = bioEnabled ? await isBiometricUnlockAvailable() : false;
        if (bioEnabled && bioAvailable) {
          const ok = await authenticateBiometricUnlock(
            i18n.t("settings.biometricUnlockPrompt", {
              defaultValue: "Unlock Night Cabinet",
            }),
          );
          if (!ok) {
            await onRestoreFail();
            return;
          }
        }
        await onRestoreSuccess(savedToken);
      } catch {
        await onRestoreFail();
      }
    };
    if (loading) {
      restore();
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      void Promise.resolve(onUnauthorized());
    });
    return () => setOnUnauthorized(null);
  }, [token]);

  useEffect(() => {
    if (!token || !autoRefreshOrders) {
      return;
    }
    const onOrdersList = view === "orders" && !selectedOrder;
    const onOrderDetails = view === "orderDetails" && !!selectedOrder;
    if (!onOrdersList && !onOrderDetails) {
      return;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        loadOrders(token).catch((error) => {
          if (!orderPollErrShownRef.current) {
            orderPollErrShownRef.current = true;
            toast.error(i18n.t("orderActions.autoRefreshFailed", { message: parseError(error) }));
          }
        });
      }, ORDER_REFRESH_INTERVAL_MS);
    };
    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") startPolling();
      else stopPolling();
    });
    if (AppState.currentState === "active") startPolling();
    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [token, view, selectedOrder, autoRefreshOrders]);

  useEffect(() => {
    hydrateAnalyticsQueue().catch(() => {
      trackEvent("analytics_hydrate_fail");
    });
  }, []);

  const appOpenTrackedRef = useRef(false);
  useEffect(() => {
    if (loading || appOpenTrackedRef.current) return;
    appOpenTrackedRef.current = true;
    trackEvent("app_open", { loggedIn: Boolean(token) });
    const envWarnings = getProductionEnvWarnings();
    if (envWarnings.length) {
      trackEvent("production_env_warning", { message: envWarnings.join(" · ") });
    }
  }, [loading, token]);

  useEffect(() => {
    if (token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (delayMs: number) => {
      timer = setTimeout(() => {
        if (!cancelled) flushGuest();
      }, delayMs);
    };
    const flushGuest = () => {
      if (cancelled) return;
      const batch = drainEvents(30);
      if (!batch.length) {
        schedule(15000);
        return;
      }
      uploadGuestAnalyticsEvents(batch)
        .then(() => schedule(15000))
        .catch(() => {
          requeueEvents(batch);
          markAnalyticsUploadError();
          schedule(30000);
        });
    };
    flushGuest();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (delayMs: number) => {
      timer = setTimeout(() => {
        if (!cancelled) flushOnce();
      }, delayMs);
    };
    const flushOnce = () => {
      const batch = drainEvents(30);
      if (!batch.length) {
        schedule(12000);
        return;
      }
      uploadAnalyticsEvents(token, batch)
        .then(() => {
          analyticsRetryMsRef.current = 12000;
          schedule(analyticsRetryMsRef.current);
        })
        .catch((error) => {
          requeueEvents(batch);
          markAnalyticsUploadError();
          trackEvent("analytics_upload_error", { message: parseError(error), batchSize: batch.length });
          analyticsRetryMsRef.current = Math.min(120000, analyticsRetryMsRef.current * 2);
          schedule(analyticsRetryMsRef.current);
        });
    };
    flushOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);
}
