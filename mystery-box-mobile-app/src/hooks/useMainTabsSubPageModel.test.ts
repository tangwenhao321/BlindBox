import { describe, expect, it, vi } from "vitest";
import { assembleAppMainTabsInput } from "./assembleAppMainTabsInput";
import { buildBoxViewProps } from "./mainTabs/buildBoxViewProps";
import { buildOrderViewProps } from "./mainTabs/buildOrderViewProps";
import { buildAccountViewProps } from "./mainTabs/buildAccountViewProps";

export function minimalMainTabsSlices() {
  const noop = vi.fn();
  return {
    nav: { view: "orders" as const, navigate: noop, resetTo: noop, goBack: noop, navigationEpoch: 0 },
    auth: { token: "tok-1", openLoginPage: noop, requireAuth: () => true, userProfile: null },
    wallet: {
      balance: 12,
      balanceUpdatedAtText: "now",
      onRefreshBalance: async () => undefined,
      refreshingBalance: false,
      loadBalanceLogs: async () => undefined,
      balanceLogs: [],
      balanceLogsLoading: false,
      balanceLogsLoadError: null,
      refreshBalance: async () => undefined,
    },
    shell: {
      setGlobalErrors: noop,
      pageLoading: false,
      globalErrors: [],
      refreshAllWithLoading: async () => undefined,
      orderBadges: { pendingPay: 1, pendingDelivery: 0, pendingReceive: 0, completed: 0 },
      orderTabCounts: { ALL: 1, TO_BE_PAID: 1 },
      warehousePendingCount: 2,
    },
    catalog: {
      boxes: [],
      mallBoxes: [],
      mallCategoryId: undefined,
      mallKeyword: undefined,
      boxesLoadError: null,
      mallLoadError: null,
      activeBox: null,
      setActiveBox: noop,
      loadMallBoxes: async () => undefined,
      loadMoreBoxes: async () => undefined,
      loadMoreMallBoxes: async () => undefined,
      refreshMallCatalog: async () => undefined,
      setPageLoading: noop,
      hasMoreBoxes: false,
      hasMoreMallBoxes: false,
      loadingMoreBoxes: false,
      loadingMoreMallBoxes: false,
      handleMallCategoryChange: noop,
      handleMallSearch: noop,
      homeBanner: {},
      openDetailsPage: noop,
      selectedActivity: null,
      setSelectedActivity: noop,
    },
    catalogSearch: {
      openCatalogSearch: noop,
      catalogSearchInitialKeyword: "box",
    },
    checkout: {
      addresses: [],
      addressesLoading: false,
      addressesLoadError: null,
      selectedAddressId: "",
      setSelectedAddressId: noop,
      creatingOrder: false,
      openAddressFormPage: noop,
      quote: null,
      quotingPrice: false,
      quoteError: null,
      availableCoupons: [],
      selectedCouponUserId: "",
      setSelectedCouponUserId: noop,
      openAddressForm: noop,
      loadAddresses: async () => undefined,
      onSetDefaultAddress: noop,
      onDeleteAddress: noop,
      drawCount: 1,
      setDrawCount: noop,
      createOrder: noop,
      pendingCheckoutResume: false,
      setPendingCheckoutResume: noop,
      spendLimitRefreshKey: 0,
    },
    orders: {
      selectedOrder: null,
      setSelectedOrder: noop,
      orders: [],
      loadOrders: async () => undefined,
      loadOrdersDebounced: noop,
      loadMoreOrders: async () => undefined,
      hasMoreOrders: false,
      loadingMoreOrders: false,
      requestPayment: async () => undefined,
      openOrderDetailsPage: noop,
      refreshOrderDetails: noop,
      cancelUnpaidOrder: noop,
      redeemToBalance: noop,
      confirmReceive: noop,
      isUnpaidOrder: () => false,
      orderStatusFilter: "ALL",
      autoRefreshOrders: false,
      orderKeyword: "",
      setOrderStatusFilter: noop,
      setAutoRefreshOrders: noop,
      setOrderKeyword: noop,
      searchedOrders: [],
      onFilterByStatus: noop,
      ordersLoadError: null,
    },
    account: {
      couponCount: 0,
      publicConfig: {
        supportHotline: "",
        enterpriseWechat: "",
        revealParticleScale: 1,
        revealConfettiScale: 1,
        revealDelayMsOverride: 0,
        revealChargeScale: 1,
        revealFlashScale: 1,
        revealLustreScale: 1,
        revealFeedTickerEnabled: true,
        revealInterDrawDelayMs: 450,
        revealFinalePauseMs: 600,
        revealFinaleHoldMsExtra: 300,
        revealFinaleTeaserEnabled: true,
        revealSilenceBeforeFinaleMs: 220,
        revealSummaryHeroMs: 1800,
        loading: false,
        loadError: null,
        reload: async () => undefined,
      },
      openFeaturePage: noop,
      unreadMessageCount: 0,
      refreshServerNotifications: noop,
      setReadNotificationIds: noop,
    },
    addressForm: {
      formRealName: "",
      formPhoneNumber: "",
      formRegion: "",
      formDetails: "",
      formHouseNumber: "",
      formDistrict: "",
      formWard: "",
      formIsDefault: false,
      setFormRealName: noop,
      setFormPhoneNumber: noop,
      setFormRegion: noop,
      setFormDetails: noop,
      setFormHouseNumber: noop,
      setFormDistrict: noop,
      setFormWard: noop,
      setFormIsDefault: noop,
      editingAddressId: null,
      savingAddress: false,
      saveAddress: noop,
    },
  };
}

describe("useMainTabsViewSlices builders", () => {
  it("buildBoxViewProps reads assembled input from slices", () => {
    const slices = minimalMainTabsSlices();
    const input = assembleAppMainTabsInput(slices);
    const boxProps = buildBoxViewProps(input);
    expect(boxProps.catalogBoxes).toEqual([]);
    expect(boxProps.isLoggedIn).toBe(true);
  });

  it("buildOrderViewProps exposes order badges source orders slice", () => {
    const slices = minimalMainTabsSlices();
    const orderProps = buildOrderViewProps(assembleAppMainTabsInput(slices));
    expect(orderProps.orders).toEqual([]);
    expect(orderProps.orderStatusFilter).toBe("ALL");
  });

  it("buildAccountViewProps wires profile login state", () => {
    const slices = minimalMainTabsSlices();
    const account = buildAccountViewProps(assembleAppMainTabsInput(slices));
    expect(account.profileViewProps.isLoggedIn).toBe(true);
    expect(account.featureViewProps.onOpenFeature).toBeTypeOf("function");
  });
});
