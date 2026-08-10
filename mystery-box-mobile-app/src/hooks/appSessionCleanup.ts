import type { AppView } from "../components/mainTabs/appViews";
import i18n from "../i18n";
import type { MysteryBox, Order } from "../types";
import { clearCrashMonitoringUser } from "../utils/crashMonitoring";
import { toast } from "../utils/toast";

export type AppSessionCleanupDeps = {
  logout: () => Promise<void>;
  clearAll: () => void;
  resetWallet: () => void;
  clearHomeBanner: () => void;
  resetCouponSelection: () => void;
  setActiveBox: (box: MysteryBox | null) => void;
  setSelectedOrder: (order: Order | null) => void;
  resetTo: (tab: AppView) => void;
  unregisterPushToken?: () => Promise<void>;
};

export async function clearAppSession(
  deps: AppSessionCleanupDeps,
  options?: { toastUnauthorized?: boolean },
): Promise<void> {
  await deps.unregisterPushToken?.();
  await deps.logout();
  deps.clearAll();
  deps.resetWallet();
  deps.clearHomeBanner();
  deps.resetCouponSelection();
  deps.setActiveBox(null);
  deps.setSelectedOrder(null);
  clearCrashMonitoringUser();
  deps.resetTo("home");
  if (options?.toastUnauthorized) {
    toast.error(i18n.t("auth.sessionExpired"));
  }
}
