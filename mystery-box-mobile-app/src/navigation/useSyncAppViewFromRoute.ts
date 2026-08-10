import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import { useMainTabsRouteSyncOptional } from "../context/MainTabsContext";
import { setPaymentReturnParams } from "./paymentReturnParams";
import { setSpectatorToken } from "./spectatorParams";
import { dismissVnpayCheckoutModal, dismissMomoCheckoutModal } from "../payment/paymentShellBridge";
import { shouldSkipDuplicateEntityRouteSync, shouldSkipStaleRouteSync } from "./routeSyncGuards";

export { shouldSkipDuplicateEntityRouteSync, shouldSkipStaleRouteSync } from "./routeSyncGuards";

type SyncParams = {
  view: AppView;
  orderId?: string;
  boxId?: string;
  paymentResponseCode?: string;
  spectatorToken?: string;
};

/**
 * Keeps legacy MainTabs navigation state aligned with the current expo-router screen.
 * Used by thin route files under app/(shell)/.
 */
export function useSyncAppViewFromRoute({ view, orderId, boxId, paymentResponseCode, spectatorToken }: SyncParams) {
  const nav = useMainTabsRouteSyncOptional();
  const isFocused = useIsFocused();
  const openOrderRef = useRef(nav?.openOrderDetailsPage);
  const openBoxRef = useRef(nav?.openBoxDetailsPage);
  openOrderRef.current = nav?.openOrderDetailsPage;
  openBoxRef.current = nav?.openBoxDetailsPage;

  const navigateFn = nav?.navigate;
  const lastSyncedEpochRef = useRef(nav?.navigationEpoch ?? 0);
  const lastSyncedBoxIdRef = useRef<string | undefined>(undefined);
  const lastSyncedOrderIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (nav?.appView !== "boxDetails") {
      lastSyncedBoxIdRef.current = undefined;
    }
    if (nav?.appView !== "orderDetails") {
      lastSyncedOrderIdRef.current = undefined;
    }
  }, [nav?.appView]);

  useEffect(() => {
    if (!navigateFn) return;
    // Tab routes stay mounted in the background; only the focused screen may drive AppView.
    if (!isFocused) return;

    const memoryView = nav?.appView;
    const navigationEpoch = nav?.navigationEpoch ?? 0;
    if (
      shouldSkipStaleRouteSync(view, memoryView, navigationEpoch, lastSyncedEpochRef.current)
    ) {
      return;
    }
    if (memoryView === view) {
      lastSyncedEpochRef.current = navigationEpoch;
      return;
    }
    if (
      view === "orderDetails" &&
      orderId &&
      shouldSkipDuplicateEntityRouteSync(orderId, lastSyncedOrderIdRef.current)
    ) {
      lastSyncedEpochRef.current = navigationEpoch;
      return;
    }
    if (
      view === "boxDetails" &&
      boxId &&
      shouldSkipDuplicateEntityRouteSync(boxId, lastSyncedBoxIdRef.current)
    ) {
      lastSyncedEpochRef.current = navigationEpoch;
      return;
    }
    lastSyncedEpochRef.current = navigationEpoch;

    if (view === "orderDetails" && orderId) {
      lastSyncedOrderIdRef.current = orderId;
      void openOrderRef.current?.(orderId);
      return;
    }
    if (view === "boxDetails" && boxId) {
      lastSyncedBoxIdRef.current = boxId;
      void openBoxRef.current?.(boxId);
      return;
    }
    if (view === "paymentReturn" && orderId) {
      setPaymentReturnParams({ orderId, paymentResponseCode });
      dismissVnpayCheckoutModal();
      dismissMomoCheckoutModal();
    }
    if (view === "revealSpectator" && spectatorToken) {
      setSpectatorToken(spectatorToken);
    }
    navigateFn(view, { skipRouterSync: true });
  }, [isFocused, nav?.appView, nav?.navigationEpoch, navigateFn, view, orderId, boxId, paymentResponseCode, spectatorToken]);
}
