import { useEffect, useMemo, useState } from "react";
import { clearPaymentReturnParams, peekPaymentReturnParams } from "../navigation/paymentReturnParams";
import { peekActiveOrderResult, settlePaymentFromReturn } from "../payment/paymentShellBridge";
import { isAppViewAccessible } from "../config/featureAccess";
import i18n from "../i18n";
import { toast } from "../utils/toast";
import { useTranslation } from "react-i18next";
import { ORDER_STATUS } from "../config/constants";
import { FEATURE_KEYS } from "../config/featureRegistry";
import { useAuthToken } from "./useAuthToken";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query/keys";
import { fetchWarehouseItemCount } from "../services/warehouseService";
import { computeMyOrdersTabCounts, filterOrderDisplayRows } from "../utils/orderDisplayRows";
import { useOrderWarehouseItems } from "./useOrderWarehouseItems";
import { clearPendingFairnessRoute, peekPendingFairnessRoute } from "../navigation/fairnessRouteContext";
import {
  useMainTabsCatalogSearch,
  useMainTabsNav,
  useMainTabsOrders,
} from "../context/MainTabsContext";
import { buildAccountViewProps } from "./mainTabs/buildAccountViewProps";
import { dedupeMysteryBoxes } from "../utils/boxDisplay";
import {
  useAssembledMainTabsInput,
  useMainTabsAccountViewProps,
  useMainTabsActivityDetailProps,
  useMainTabsBalanceLogsViewProps,
  useMainTabsBoxViewProps,
  useMainTabsOrderViewProps,
  useMainTabsShellViewState,
} from "./useMainTabsViewSlices";

function navigateToWelfare(setView: (view: "welfare") => void) {
  if (!isAppViewAccessible("welfare")) {
    toast.info(i18n.t("featureDisabled"));
    return;
  }
  setView("welfare");
}

function useCatalogBoxList() {
  const boxViewProps = useMainTabsBoxViewProps();

  return useMemo(
    () =>
      boxViewProps.catalogBoxes ??
      dedupeMysteryBoxes([...boxViewProps.boxes, ...boxViewProps.mallBoxes]),
    [boxViewProps.boxes, boxViewProps.catalogBoxes, boxViewProps.mallBoxes],
  );
}

export function useGoBackScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  return useMemo(() => ({ onBack: goBack }), [goBack]);
}

export function useBoxDetailsScreenProps(offline: boolean) {
  const { goBack, isLoggedIn, onOpenLogin } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();
  const { featureViewProps } = useMainTabsAccountViewProps();

  return useMemo(
    () => ({
      activeBox: boxViewProps.activeBox,
      addresses: boxViewProps.addresses,
      selectedAddressId: boxViewProps.selectedAddressId,
      creatingOrder: boxViewProps.creatingOrder,
      onBack: boxViewProps.onBackBoxList ?? goBack,
      onOpenAddressModal: boxViewProps.onOpenAddressModal,
      onOpenAddressFormPage: boxViewProps.onOpenAddressFormPage,
      onContactSupport: () => featureViewProps.onOpenFeature(FEATURE_KEYS.CONTACT_SUPPORT),
      isLoggedIn: boxViewProps.isLoggedIn ?? isLoggedIn,
      onRequireLogin: boxViewProps.onRequireLogin ?? onOpenLogin,
      resumeConfirmCheckout: boxViewProps.resumeConfirmCheckout,
      onResumeConfirmHandled: boxViewProps.onResumeConfirmHandled,
      spendLimitRefreshKey: boxViewProps.spendLimitRefreshKey,
      drawCount: boxViewProps.drawCount,
      onChangeDrawCount: boxViewProps.onChangeDrawCount,
      onCreateOrder: boxViewProps.onCreateOrder,
      onOpenProbability: boxViewProps.onOpenProbability,
      onOpenLeaderboard: boxViewProps.onOpenLeaderboard,
      quotePayAmount: boxViewProps.quotePayAmount,
      quoteProductAmount: boxViewProps.quoteProductAmount,
      quoteDeliveryFee: boxViewProps.quoteDeliveryFee,
      quoteCouponAmount: boxViewProps.quoteCouponAmount,
      quoteRetentionDiscount: boxViewProps.quoteRetentionDiscount,
      quoteSavingsAmount: boxViewProps.quoteSavingsAmount,
      suggestedCouponApplied: boxViewProps.suggestedCouponApplied,
      quotingPrice: boxViewProps.quotingPrice,
      quoteError: boxViewProps.quoteError,
      onRetryQuote: boxViewProps.onRetryQuote,
      offline,
      skipOnboardingCoach: boxViewProps.skipOnboardingCoach,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [boxViewProps, featureViewProps.onOpenFeature, goBack, isLoggedIn, offline, onOpenLogin],
  );
}

export function useMyOrdersScreenProps() {
  const { goBack, pageLoading, resetTab, onOpenLogin } = useMainTabsShellViewState();
  const orderViewProps = useMainTabsOrderViewProps();
  const authToken = useAuthToken();
  const warehouseQuery = useOrderWarehouseItems(authToken);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  const warehouseItems = warehouseQuery.data?.items ?? [];
  const warehouseLoading = warehouseQuery.isLoading || warehouseQuery.isFetching;
  const warehouseTotalQuery = useQuery({
    queryKey: queryKeys.warehouse.count(authToken, false),
    queryFn: () => fetchWarehouseItemCount(authToken, false),
    enabled: !!authToken,
    staleTime: 15_000,
  });

  const displayRows = useMemo(
    () =>
      filterOrderDisplayRows(
        orderViewProps.searchedOrders,
        orderViewProps.orderStatusFilter,
        orderViewProps.orderKeyword,
        warehouseItems,
      ),
    [orderViewProps.searchedOrders, orderViewProps.orderStatusFilter, orderViewProps.orderKeyword, warehouseItems],
  );

  const tabCounts = useMemo(
    () =>
      computeMyOrdersTabCounts(orderViewProps.orders, warehouseItems, {
        warehouseTotalCount: warehouseTotalQuery.data?.count,
      }),
    [orderViewProps.orders, warehouseItems, warehouseTotalQuery.data?.count],
  );

  useEffect(() => {
    if (authToken) void warehouseQuery.refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [authToken, warehouseQuery.refetch]);

  const listLoading = pageLoading || (authToken ? warehouseLoading && warehouseItems.length === 0 : false);
  const usesWarehouseData =
    orderViewProps.orderStatusFilter === "ALL" ||
    orderViewProps.orderStatusFilter === ORDER_STATUS.TO_BE_DELIVERED;

  return useMemo(
    () => ({
      displayRows,
      tabCounts,
      orders: orderViewProps.searchedOrders,
      orderStatusFilter: orderViewProps.orderStatusFilter,
      setOrderStatusFilter: orderViewProps.setOrderStatusFilter,
      orderKeyword: orderViewProps.orderKeyword,
      setOrderKeyword: orderViewProps.setOrderKeyword,
      autoRefreshOrders: orderViewProps.autoRefreshOrders,
      setAutoRefreshOrders: orderViewProps.setAutoRefreshOrders,
      onBack: goBack,
      pageLoading: listLoading,
      onRefresh: orderViewProps.onRefreshOrders,
      onOpenOrderDetails: orderViewProps.onOpenOrderDetails,
      onPay: (id: string) => {
        const target = orderViewProps.orders.find((o) => o.id === id) ?? orderViewProps.searchedOrders.find((o) => o.id === id);
        orderViewProps.onPay(id, target?.baseOrder?.payment?.payAmount);
      },
      onCancel: orderViewProps.onCancelUnpaidOrder,
      isUnpaidOrder: orderViewProps.isUnpaidOrder,
      onLoadMore: usesWarehouseData ? undefined : orderViewProps.onLoadMoreOrders,
      hasMore: usesWarehouseData ? false : orderViewProps.hasMoreOrders,
      loadingMore: orderViewProps.loadingMoreOrders,
      loadError: orderViewProps.ordersLoadError,
      onRetryLoad: orderViewProps.onRetryOrders,
      onGoShopping: () => resetTab("home"),
      onRequireLogin: onOpenLogin,
    }),
    [displayRows, goBack, listLoading, onOpenLogin, orderViewProps, resetTab, tabCounts, usesWarehouseData],
  );
}

export function useOrderDetailsScreenProps() {
  const catalogSearch = useMainTabsCatalogSearch();
  const orderViewProps = useMainTabsOrderViewProps();

  return useMemo(() => {
    const selected = orderViewProps.selectedOrder;
    const unpaid = selected ? orderViewProps.isUnpaidOrder(selected) : false;
    return {
      order: selected,
      canCancel: unpaid,
      canPay: unpaid,
      onBack: orderViewProps.onBackOrderList,
      onPay: (id: string) => {
        const target = orderViewProps.orders.find((o) => o.id === id) || selected;
        orderViewProps.onPay(id, target?.baseOrder?.payment?.payAmount);
      },
      onRefresh: orderViewProps.onRefreshOrderDetails,
      onCancel: orderViewProps.onCancelUnpaidOrder,
      onConfirmReceive: orderViewProps.onConfirmReceive,
      refreshing: false,
      onShareToCommunity: catalogSearch.openCommunityWithDraft,
    };
  }, [catalogSearch.openCommunityWithDraft, orderViewProps]);
}

export function useMessageCenterScreenProps() {
  const { goBack, resetTab } = useMainTabsShellViewState();
  const nav = useMainTabsNav();
  const orders = useMainTabsOrders();
  const input = useAssembledMainTabsInput();
  const messageViewProps = useMemo(() => buildAccountViewProps(input).messageViewProps, [input]);

  return useMemo(
    () => ({
      ...messageViewProps,
      onBack: goBack,
      onOpenPendingOrders: () => {
        orders.setOrderStatusFilter(ORDER_STATUS.TO_BE_PAID);
        nav.navigate("orders");
      },
      onGoWarehouse: () => resetTab("warehouse"),
    }),
    [goBack, messageViewProps, nav, orders, resetTab],
  );
}

export function useCatalogSearchScreenProps() {
  const { goBack, resetTab, catalogSearchInitialKeyword = "" } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();

  return useMemo(
    () => ({
      initialKeyword: catalogSearchInitialKeyword,
      onBack: goBack,
      onOpenBox: (boxId: string) => void boxViewProps.onOpenDetails(boxId),
      onMallSearchCommit: (keyword: string) => {
        boxViewProps.onMallSearch?.(keyword);
        resetTab("mall");
      },
    }),
    [boxViewProps, catalogSearchInitialKeyword, goBack, resetTab],
  );
}

export function useRefundsScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  const nav = useMainTabsNav();
  const orders = useMainTabsOrders();
  const orderViewProps = useMainTabsOrderViewProps();

  return useMemo(
    () => ({
      onBack: goBack,
      onOpenOrder: (orderId: string) => orderViewProps.onOpenOrderDetails(orderId),
      onGoOrders: () => {
        orders.setOrderStatusFilter("ALL");
        nav.navigate("orders");
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [goBack, nav, orderViewProps.onOpenOrderDetails, orders],
  );
}

export function useAddressManageScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();

  return useMemo(
    () => ({
      addresses: boxViewProps.addresses,
      selectedAddressId: boxViewProps.selectedAddressId,
      loading: boxViewProps.addressesLoading,
      loadError: boxViewProps.addressesLoadError,
      onRetryLoad: boxViewProps.onRefreshAddresses,
      onBack: goBack,
      onRefresh: boxViewProps.onRefreshAddresses,
      onAdd: () => boxViewProps.onOpenAddressFormPage(),
      onEdit: (addr: Parameters<typeof boxViewProps.onOpenAddressFormPage>[0]) =>
        boxViewProps.onOpenAddressFormPage(addr),
      onSelect: boxViewProps.onSelectAddress,
      onSetDefault: boxViewProps.onSetDefaultAddress,
      onDelete: boxViewProps.onDeleteAddress,
    }),
    [boxViewProps, goBack],
  );
}

export function useFeedbackScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  const { feedbackViewProps } = useMainTabsAccountViewProps();

  return useMemo(
    () => ({
      onBack: goBack,
      onSubmit: feedbackViewProps.onSubmit,
      onLoadHistory: feedbackViewProps.onLoadHistory,
    }),
    [feedbackViewProps.onLoadHistory, feedbackViewProps.onSubmit, goBack],
  );
}

export function useSettingsScreenProps() {
  return useMainTabsAccountViewProps().settingsViewProps;
}

export function useIpThemeScreenProps() {
  const { goBack, resetTab, pageLoading, onRetryFromError } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();
  const catalogBoxes = useCatalogBoxList();

  return useMemo(
    () => ({
      boxes: catalogBoxes,
      onBack: goBack,
      onOpenDetails: boxViewProps.onOpenDetails,
      catalogLoadError: boxViewProps.boxesLoadError || boxViewProps.mallLoadError,
      onRetryCatalog: onRetryFromError,
      onRefresh: boxViewProps.onRefreshAll,
      refreshing: pageLoading,
      onGoHome: () => resetTab("home"),
    }),
    [boxViewProps, catalogBoxes, goBack, onRetryFromError, pageLoading, resetTab],
  );
}

export function useFavoritesScreenProps() {
  const { goBack, resetTab, onOpenLogin } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();
  const catalogBoxes = useCatalogBoxList();

  return useMemo(
    () => ({
      catalogBoxes,
      onBack: goBack,
      onOpenBox: (boxId: string) => boxViewProps.onOpenDetails(boxId),
      onGoBrowse: () => resetTab("home"),
      onRequireLogin: onOpenLogin,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [boxViewProps.onOpenDetails, catalogBoxes, goBack, onOpenLogin, resetTab],
  );
}

export function useCommunityScreenProps() {
  const { goBack, resetTab, onOpenLogin, userProfile, communityDraft = "" } =
    useMainTabsShellViewState();

  return useMemo(
    () => ({
      userId: userProfile?.id,
      onBack: goBack,
      onRequireLogin: onOpenLogin,
      onGoHome: () => resetTab("home"),
      initialDraft: communityDraft,
    }),
    [communityDraft, goBack, onOpenLogin, resetTab, userProfile?.id],
  );
}

export function useMarketplaceScreenProps() {
  const { goBack, resetTab, onOpenLogin } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      onBack: goBack,
      onRequireLogin: onOpenLogin,
      onGoWarehouse: () => resetTab("warehouse"),
    }),
    [goBack, onOpenLogin, resetTab],
  );
}

export function useShipRequestsScreenProps() {
  const { goBack, resetTab } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      onBack: goBack,
      onGoWarehouse: () => resetTab("warehouse"),
    }),
    [goBack, resetTab],
  );
}

export function useExchangeMallScreenProps() {
  const { goBack, resetTab, onOpenLogin } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      onBack: goBack,
      onGoWarehouse: () => resetTab("warehouse"),
      onRequireLogin: onOpenLogin,
    }),
    [goBack, onOpenLogin, resetTab],
  );
}

export function useLeaderboardScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  const { activeBox } = useMainTabsBoxViewProps();

  return useMemo(
    () => ({
      mysteryBoxId: activeBox?.id,
      onBack: goBack,
    }),
    [activeBox?.id, goBack],
  );
}

export function useProbabilityScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  const { activeBox } = useMainTabsBoxViewProps();

  return useMemo(
    () => ({
      box: activeBox,
      onBack: goBack,
    }),
    [activeBox, goBack],
  );
}

export function useCouponsScreenProps() {
  const { goBack, resetTab, setView, onOpenLogin } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();

  return useMemo(
    () => ({
      onBack: goBack,
      onGoWelfare: () => navigateToWelfare(setView),
      onGoMall: () => resetTab("mall"),
      onOpenBox: (boxId: string) => void boxViewProps.onOpenDetails(boxId),
      onRequireLogin: onOpenLogin,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [boxViewProps.onOpenDetails, goBack, onOpenLogin, resetTab, setView],
  );
}

export function useCommissionScreenProps() {
  const { goBack, setView } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      onBack: goBack,
      onGoPromotion: () => setView("promotion"),
    }),
    [goBack, setView],
  );
}

export function useFairnessVerifyScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  const { selectedOrder } = useMainTabsOrderViewProps();

  return useMemo(() => {
    const pending = peekPendingFairnessRoute();
    const modalOrder = peekActiveOrderResult();
    const orderId = pending?.orderId ?? modalOrder?.orderId ?? selectedOrder?.id;
    const mysteryBoxId =
      pending?.mysteryBoxId ??
      modalOrder?.boxId ??
      selectedOrder?.items?.[0]?.mysteryBoxId ??
      selectedOrder?.items?.[0]?.mysteryBox?.id;
    return {
      orderId,
      mysteryBoxId,
      onBack: () => {
        clearPendingFairnessRoute();
        const fromOrderResultModal = peekActiveOrderResult() != null;
        goBack(fromOrderResultModal ? { skipRouterSync: true } : undefined);
      },
    };
  }, [goBack, selectedOrder?.id, selectedOrder?.items]);
}

export function useActivityDetailScreenProps() {
  const { goBack } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();
  const activityDetailProps = useMainTabsActivityDetailProps();

  return useMemo(
    () => ({
      activity: activityDetailProps.activity,
      catalogBoxes: activityDetailProps.catalogBoxes,
      onBack: goBack,
      onOpenBox: (boxId: string) => void boxViewProps.onOpenDetails(boxId),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [activityDetailProps.activity, activityDetailProps.catalogBoxes, boxViewProps.onOpenDetails, goBack],
  );
}

export function useBalanceLogsScreenProps() {
  return useMainTabsBalanceLogsViewProps();
}

export function useAddressFormScreenProps() {
  return useMainTabsAccountViewProps().addressFormViewProps;
}

export function useWelfareScreenProps() {
  const { t } = useTranslation();
  const { goBack, onOpenLogin } = useMainTabsShellViewState();
  const { featureViewProps } = useMainTabsAccountViewProps();

  return useMemo(
    () => ({
      pageTitle: t("welfare.pageTitle"),
      onBack: goBack,
      onOpenCoupons: () => featureViewProps.onOpenFeature(FEATURE_KEYS.COUPONS),
      onRequireLogin: onOpenLogin,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [featureViewProps.onOpenFeature, goBack, onOpenLogin, t],
  );
}

export function usePlayGuideScreenProps() {
  const { t } = useTranslation();
  const { goBack } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      title: t("playGuide.title"),
      onBack: goBack,
      paragraphs: [t("playGuide.p1"), t("playGuide.p2"), t("playGuide.p3"), t("playGuide.p4")],
    }),
    [goBack, t],
  );
}

export function usePrivacyScreenProps() {
  const { t } = useTranslation();
  const { goBack } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      title: t("settings.privacyPolicy"),
      onBack: goBack,
      paragraphs: [t("privacyPage.p1"), t("privacyPage.p2"), t("privacyPage.p3"), t("privacyPage.p4"), t("privacyPage.p5")],
    }),
    [goBack, t],
  );
}

export function useTermsOfServiceScreenProps() {
  const { t } = useTranslation();
  const { goBack } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      title: t("legal.termsTitle"),
      onBack: goBack,
      paragraphs: [t("legal.termsP1"), t("legal.termsP2"), t("legal.termsP3"), t("legal.termsP4")],
    }),
    [goBack, t],
  );
}

export function useMinorDeclarationScreenProps() {
  const { t } = useTranslation();
  const { goBack } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      title: t("legal.minorTitle"),
      onBack: goBack,
      paragraphs: [t("legal.minorP1"), t("legal.minorP2"), t("legal.minorP3")],
    }),
    [goBack, t],
  );
}

export function usePaymentReturnScreenProps() {
  const { resetTab, onOpenLogin } = useMainTabsShellViewState();
  const nav = useMainTabsNav();
  const orderViewProps = useMainTabsOrderViewProps();
  const [params, setParams] = useState(() => peekPaymentReturnParams());

  useEffect(() => {
    setParams(peekPaymentReturnParams());
  }, []);

  return useMemo(
    () => ({
      orderId: params?.orderId ?? "",
      responseCode: params?.paymentResponseCode,
      onGoOrder: (orderId: string) => {
        clearPaymentReturnParams();
        void orderViewProps.onOpenOrderDetails(orderId);
      },
      onGoHome: () => {
        clearPaymentReturnParams();
        resetTab("home");
      },
      onRetryPay: (orderId: string) => {
        clearPaymentReturnParams();
        const target = orderViewProps.orders.find((o) => o.id === orderId);
        orderViewProps.onPay(orderId, target?.baseOrder?.payment?.payAmount);
        nav.goBack();
      },
      onPaymentSettled: (orderId: string) => settlePaymentFromReturn(orderId),
      onRequireLogin: onOpenLogin,
    }),
    [nav, onOpenLogin, orderViewProps, params, resetTab],
  );
}

export function useCurrencyExplainScreenProps(kind: "luckyCoins" | "starStones") {
  const { goBack, setView, userProfile } = useMainTabsShellViewState();

  return useMemo(
    () => ({
      kind,
      fallbackAmount:
        kind === "luckyCoins" ? (userProfile?.luckyCoins ?? 0) : (userProfile?.starStones ?? 0),
      onBack: goBack,
      onGoWelfare: () => navigateToWelfare(setView),
    }),
    [goBack, kind, setView, userProfile?.luckyCoins, userProfile?.starStones],
  );
}
