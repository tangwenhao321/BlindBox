import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import type { AppView } from "../components/mainTabs/appViews";
import { isTabAppView } from "../components/mainTabs/appViews";
import { isAppViewAccessible } from "../config/featureAccess";
import i18n from "../i18n";
import {
  isMainTabsSubPage,
  resolveMainTabsActiveTab,
} from "../components/mainTabs/mainTabsNavigation";
import {
  syncAppViewToExpoRouter,
  syncExpoRouterBack,
  type ExpoRouterSyncOptions,
} from "../navigation/expoRouterNavigationSync";
import { toast } from "../utils/toast";

export type { AppView } from "../components/mainTabs/appViews";
export { isTabAppView, isTabAppView as isTabView } from "../components/mainTabs/appViews";

function syncRouterToView(view: AppView, options?: Pick<NavigateOptions, "skipRouterSync"> & ExpoRouterSyncOptions) {
  if (options?.skipRouterSync) return;
  syncAppViewToExpoRouter(view, {
    replace: options?.replace ?? isTabAppView(view),
    orderId: options?.orderId,
    boxId: options?.boxId,
  });
}

export type NavigateOptions = ExpoRouterSyncOptions & {
  skipRouterSync?: boolean;
};

export function useAppNavigation(initial: AppView = "home") {
  const [view, setViewState] = useState<AppView>(initial);
  const [navigationEpoch, setNavigationEpoch] = useState(0);
  const stackRef = useRef<AppView[]>([initial]);
  const routeParamsRef = useRef<{ orderId?: string; boxId?: string }>({});
  /** Last tab the user was on before opening a sub-page (for safe back fallback). */
  const lastTabRef = useRef<AppView>(initial);

  const bumpNavigationEpoch = useCallback(() => {
    setNavigationEpoch((epoch) => epoch + 1);
  }, []);

  const navigate = useCallback((next: AppView, options?: NavigateOptions) => {
    let target = next;
    if (!isAppViewAccessible(target)) {
      toast.info(i18n.t("featureDisabled"));
      target = "home";
    }
    const current = stackRef.current[stackRef.current.length - 1];
    const sameEntity =
      (target === "boxDetails" && options?.boxId && routeParamsRef.current.boxId === options.boxId) ||
      (target === "orderDetails" && options?.orderId && routeParamsRef.current.orderId === options.orderId);
    if (!options?.replace && current === target && (sameEntity || (!options?.orderId && !options?.boxId))) {
      return;
    }
    if (options?.replace) {
      const base = stackRef.current.slice(0, -1);
      stackRef.current = [...base, target];
    } else {
      if (isTabAppView(current) && isMainTabsSubPage(target)) {
        lastTabRef.current = current;
      }
      stackRef.current = [...stackRef.current, target];
    }
    if (isTabAppView(target)) {
      lastTabRef.current = target;
    }
    if (options?.orderId) routeParamsRef.current.orderId = options.orderId;
    if (options?.boxId) routeParamsRef.current.boxId = options.boxId;
    bumpNavigationEpoch();
    setViewState(target);
    if (!options?.skipRouterSync) {
      syncAppViewToExpoRouter(target, {
        replace: options?.replace,
        orderId: options?.orderId ?? routeParamsRef.current.orderId,
        boxId: options?.boxId ?? routeParamsRef.current.boxId,
      });
    }
  }, [bumpNavigationEpoch]);

  const resetTo = useCallback((next: AppView, options?: Pick<NavigateOptions, "skipRouterSync">) => {
    stackRef.current = [next];
    routeParamsRef.current = {};
    lastTabRef.current = next;
    bumpNavigationEpoch();
    setViewState(next);
    if (!options?.skipRouterSync) {
      syncAppViewToExpoRouter(next, { replace: true });
    }
  }, [bumpNavigationEpoch]);

  const goBack = useCallback((options?: Pick<NavigateOptions, "skipRouterSync">) => {
    if (stackRef.current.length <= 1) {
      const current = stackRef.current[0];
      if (isMainTabsSubPage(current)) {
        const tab = isTabAppView(lastTabRef.current) ? lastTabRef.current : resolveMainTabsActiveTab(current);
        stackRef.current = [tab];
        routeParamsRef.current = {};
        bumpNavigationEpoch();
        setViewState(tab);
        syncRouterToView(tab, { ...options, replace: true });
        return true;
      }
      return false;
    }
    const leaving = stackRef.current[stackRef.current.length - 1];
    const nextStack = stackRef.current.slice(0, -1);
    stackRef.current = nextStack;
    const prev = nextStack[nextStack.length - 1];
    if (leaving === "orderDetails") routeParamsRef.current.orderId = undefined;
    if (leaving === "boxDetails") routeParamsRef.current.boxId = undefined;
    let routerBackHandled = false;
    if (isMainTabsSubPage(leaving) && !options?.skipRouterSync) {
      try {
        routerBackHandled = syncExpoRouterBack();
      } catch {
        // In-memory stack already updated; ignore router desync.
      }
    }
    bumpNavigationEpoch();
    setViewState(prev);
    if (!routerBackHandled) {
      syncRouterToView(prev, {
        ...options,
        replace: isTabAppView(prev),
        orderId: prev === "orderDetails" ? routeParamsRef.current.orderId : undefined,
        boxId: prev === "boxDetails" ? routeParamsRef.current.boxId : undefined,
      });
    }
    return true;
  }, [bumpNavigationEpoch]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (goBack()) return true;
      return false;
    });
    return () => subscription.remove();
  }, [goBack]);

  return { view, navigate, resetTo, goBack, navigationEpoch };
}
