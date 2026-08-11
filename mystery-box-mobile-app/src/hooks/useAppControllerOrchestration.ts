import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TabKey } from "../components/ui/BottomTabBar";
import { useAppAuthSession } from "./useAppAuthSession";
import { useAppBootstrap } from "./useAppBootstrap";
import { useAppData } from "./useAppData";
import { useAppNavigation } from "./useAppNavigation";
import { useAppAuthEffects } from "./useAppAuthEffects";
import { useAppPaymentShell } from "./useAppPaymentShell";
import { useAppRefresh } from "./useAppRefresh";
import { useAppSessionCleanup } from "./useAppSessionCleanup";
import { useCatalogController } from "./useCatalogController";
import { useCheckoutController } from "./useCheckoutController";
import { useWalletController } from "./useWalletController";
import { unregisterExpoPushToken } from "../services/pushTokenService";
import type { AppControllerLoadedSliceInput } from "./assembleAppControllerLoadedAssembly";
import { buildAppControllerLoadedSliceInput } from "./buildAppControllerLoadedSliceInput";
import { useOrderWarehouseItems } from "./useOrderWarehouseItems";
import { fetchWarehouseItemCount } from "../services/warehouseService";
import { queryKeys } from "../query/keys";

export type AppControllerOrchestrationResult = {
  loading: boolean;
  loadedSlices: AppControllerLoadedSliceInput;
};

export function useAppControllerOrchestration(): AppControllerOrchestrationResult {
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const { view, navigate, resetTo, goBack, navigationEpoch } = useAppNavigation("home");
  const authSession = useAppAuthSession({ resetTo });
  const {
    token,
    phone,
    password,
    setPhone,
    setPassword,
    restoreToken,
    login,
    loginWithSms,
    loginWithZalo,
    register,
    logout,
    confirmPassword,
    inviteCode,
    setInviteCode,
    clearInviteCode,
    setLoginVisible,
    openLoginPage,
    requireAuth,
  } = authSession;

  const appData = useAppData(token);
  const {
    boxes,
    mallBoxes,
    mallCategoryId,
    mallKeyword,
    hasMoreBoxes,
    loadingMoreBoxes,
    hasMoreMallBoxes,
    loadingMoreMallBoxes,
    boxesLoadError,
    mallLoadError,
    ordersLoadError,
    loadMallBoxes,
    loadMoreMallBoxes,
    addresses,
    addressesLoading,
    addressesLoadError,
    orders,
    ordersReady,
    selectedAddressId,
    setSelectedAddressId,
    loadAddresses,
    loadMoreBoxes,
    hasMoreOrders,
    loadingMoreOrders,
    loadOrders,
    loadMoreOrders,
    loadOrdersDebounced,
    refreshAll,
    refreshMallCatalog,
    clearAll,
  } = appData;

  const [globalErrors, setGlobalErrors] = useState<string[]>([]);
  const paymentShell = useAppPaymentShell(token, orders);

  const walletController = useWalletController({ token, loading, orders, ordersReady, navigate });
  const { account, walletSlice, accountSlice, onTabFocusWallet } = walletController;
  const { wallet, newcomer, refreshServerNotifications, refreshWarehouseBadge, warehousePendingCount, warehousePendingCountApproximate } = account;
  const { loadBalanceLogs, resetWallet } = wallet;
  const warehouseOrderQuery = useOrderWarehouseItems(token);
  const warehouseOrderItems = warehouseOrderQuery.data?.items ?? [];
  const warehouseTotalQuery = useQuery({
    queryKey: queryKeys.warehouse.count(token, false),
    queryFn: () => fetchWarehouseItemCount(token, false),
    enabled: !!token,
    staleTime: 15_000,
  });
  const warehouseTotalCount = warehouseTotalQuery.data?.count;
  const warehouseTotalCountApproximate = warehouseTotalQuery.data?.approximate;

  const openDetailsRef = useRef<(id: string) => Promise<unknown>>(async () => undefined);
  const resetCouponRef = useRef<() => void>(() => undefined);
  const loadCouponsRef = useRef<() => Promise<void>>(async () => undefined);
  const loadHomeBannerRef = useRef<(token: string) => Promise<void>>(async () => undefined);

  const refreshAllBase = useAppRefresh({
    token,
    refreshAll,
    refreshBalance: wallet.refreshBalance,
    loadCouponCount: wallet.loadCouponCount,
    loadHomeBanner: (usingToken) => loadHomeBannerRef.current(usingToken),
    loadBalanceLogs,
    setGlobalErrors,
    setPageLoading,
  });

  const refreshAllWithLoadingRef = useRef<
    (usingToken?: string, options?: { includeHeavy?: boolean; includeMall?: boolean }) => Promise<void>
  >(async () => undefined);

  const refreshAllWithLoading = useCallback(
    async (usingToken = token, options?: { includeHeavy?: boolean; includeMall?: boolean }) => {
      await refreshAllBase(usingToken, options);
      if (usingToken) {
        await Promise.allSettled([refreshWarehouseBadge(), refreshServerNotifications()]);
      }
    },
    [refreshAllBase, token, refreshWarehouseBadge, refreshServerNotifications],
  );

  refreshAllWithLoadingRef.current = refreshAllWithLoading;

  const catalogController = useCatalogController({
    token,
    view,
    loading,
    boxesCount: boxes.length,
    mallBoxesCount: mallBoxes.length,
    navigate,
    setPageLoading,
    loadMallBoxes,
    openDetailsRef,
    resetCouponRef,
    loadCouponsRef,
    refreshAllWithLoadingRef,
    boxes,
    mallBoxes,
    mallCategoryId: mallCategoryId ?? "",
    mallKeyword: mallKeyword ?? "",
    boxesLoadError,
    mallLoadError,
    loadMoreBoxes,
    loadMoreMallBoxes,
    refreshMallCatalog,
    hasMoreBoxes,
    hasMoreMallBoxes,
    loadingMoreBoxes,
    loadingMoreMallBoxes,
    openNewcomerOffer: () => newcomer.open(),
    orders,
    ordersReady,
  });

  loadHomeBannerRef.current = catalogController.loadHomeBannerRef.current;

  const checkoutController = useCheckoutController({
    token,
    view,
    navigate,
    goBack,
    activeBox: catalogController.catalog.activeBox,
    setActiveBox: catalogController.catalog.setActiveBox,
    addresses,
    addressesLoading,
    addressesLoadError,
    selectedAddressId,
    setSelectedAddressId,
    loadAddresses,
    orders,
    ordersReady,
    loadOrders,
    loadOrdersDebounced,
    loadMoreOrders,
    hasMoreOrders,
    loadingMoreOrders,
    ordersLoadError,
    loadBalanceLogs,
    refreshBalance: wallet.refreshBalance,
    paymentShell,
    newcomer,
    setPageLoading,
    openDetailsRef,
    resetCouponRef,
    loadCouponsRef,
    openDetailsPage: catalogController.catalog.openDetailsPage,
  });

  const { checkout, checkoutSlice, orderListSlice, addressFormSlice, shellSlice } = checkoutController;
  const { catalog, catalogSlice, catalogSearchSlice, showOnboarding, dismissOnboarding, clearHomeBannerOnSessionCleanup } =
    catalogController;

  const onTabFocus = useCallback(
    (tab: TabKey) => {
      if (tab === "warehouse") void refreshWarehouseBadge();
      onTabFocusWallet(tab);
    },
    [refreshWarehouseBadge, onTabFocusWallet],
  );

  const { onRestoreFail, onUnauthorized, clearSession } = useAppSessionCleanup({
    logout,
    clearAll,
    resetWallet,
    clearHomeBanner: clearHomeBannerOnSessionCleanup,
    resetCouponSelection: checkout.resetCouponSelection,
    setActiveBox: catalog.setActiveBox,
    setSelectedOrder: checkout.setSelectedOrder,
    resetTo,
    unregisterPushToken: token ? () => unregisterExpoPushToken(token) : undefined,
  });

  const { authHandlers } = useAppAuthEffects({
    phone,
    password,
    setPhone,
    setPassword,
    login,
    loginWithSms,
    loginWithZalo,
    register,
    confirmPassword,
    inviteCode,
    setInviteCode,
    clearInviteCode,
    setLoginVisible,
    token,
    navigate,
    resetTo,
    openOrderDetailsPage: checkout.openOrderDetailsPage,
    openBoxDetailsPage: catalog.openDetailsPage,
    refreshAllWithLoading,
    refreshServerNotifications,
    newcomerClearSession: newcomer.clearSessionOnAuth,
  });

  useAppBootstrap({
    token,
    loading,
    setLoading,
    restoreToken,
    onRestoreSuccess: async (savedToken) => {
      // Fire-and-forget: do not block splash/shell on home catalog refresh.
      void refreshAllWithLoading(savedToken, { includeHeavy: false, includeMall: false })
        .then(() => {
          loadBalanceLogs(savedToken).catch(() => undefined);
        })
        .catch(() => undefined);
    },
    onRestoreFail,
    onUnauthorized,
    view,
    selectedOrder: checkout.selectedOrder,
    autoRefreshOrders: checkout.autoRefreshOrders,
    loadOrders,
  });

  const nav = useMemo(
    () => ({ view, navigate, resetTo, goBack, navigationEpoch }),
    [view, navigate, resetTo, goBack, navigationEpoch],
  );

  const auth = useMemo(
    () => ({ token, openLoginPage, requireAuth, userProfile: wallet.userProfile, onLogout: clearSession }),
    [token, openLoginPage, requireAuth, wallet.userProfile, clearSession],
  );

  const tabsShell = useMemo(
    () => ({
      orders,
      setGlobalErrors,
      pageLoading,
      globalErrors,
      refreshAllWithLoading,
      warehousePendingCount,
      warehousePendingCountApproximate,
      warehouseTotalCount,
      warehouseTotalCountApproximate,
      warehouseOrderItems,
      onTabFocus,
    }),
    [
      orders,
      pageLoading,
      globalErrors,
      refreshAllWithLoading,
      warehousePendingCount,
      warehousePendingCountApproximate,
      warehouseTotalCount,
      warehouseTotalCountApproximate,
      warehouseOrderItems,
      onTabFocus,
    ],
  );

  const loadedSlices = useMemo(
    () =>
      buildAppControllerLoadedSliceInput({
        resetTo,
        showOnboarding,
        dismissOnboarding,
        authSession,
        authHandlers,
        nav,
        auth,
        wallet: walletSlice,
        tabsShell,
        catalog: catalogSlice,
        catalogSearch: catalogSearchSlice,
        checkout: checkoutSlice,
        orderList: orderListSlice,
        account: accountSlice,
        addressForm: addressFormSlice,
        shell: shellSlice,
      }),
    [
      resetTo,
      showOnboarding,
      dismissOnboarding,
      authSession,
      authHandlers,
      nav,
      auth,
      walletSlice,
      tabsShell,
      catalogSlice,
      catalogSearchSlice,
      checkoutSlice,
      orderListSlice,
      accountSlice,
      addressFormSlice,
      shellSlice,
    ],
  );

  return { loading, loadedSlices };
}
