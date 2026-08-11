import type { MainTabsBuildInput } from "./buildAppMainTabsProps";

export type MainTabsNavSlice = Pick<MainTabsBuildInput, "view" | "navigate" | "resetTo" | "goBack" | "navigationEpoch">;

export type MainTabsCatalogSearchSlice = Pick<
  MainTabsBuildInput,
  "openCatalogSearch" | "catalogSearchInitialKeyword" | "communityDraft" | "openCommunityWithDraft"
>;

export type MainTabsAuthSlice = Pick<
  MainTabsBuildInput,
  "token" | "openLoginPage" | "requireAuth" | "userProfile" | "onLogout"
>;

export type MainTabsWalletSlice = Pick<
  MainTabsBuildInput,
  | "balance"
  | "balanceUpdatedAtText"
  | "onRefreshBalance"
  | "refreshingBalance"
  | "loadBalanceLogs"
  | "balanceLogs"
  | "balanceLogsLoading"
  | "balanceLogsLoadError"
  | "refreshBalance"
>;

export type MainTabsShellSlice = Pick<
  MainTabsBuildInput,
  | "setGlobalErrors"
  | "pageLoading"
  | "globalErrors"
  | "refreshAllWithLoading"
  | "orderBadges"
  | "orderTabCounts"
  | "warehousePendingCount"
  | "warehousePendingCountApproximate"
  | "onTabFocus"
>;

export type MainTabsCatalogSlice = Pick<
  MainTabsBuildInput,
  | "boxes"
  | "mallBoxes"
  | "mallCategoryId"
  | "mallKeyword"
  | "activeBox"
  | "setActiveBox"
  | "loadMallBoxes"
  | "loadMoreBoxes"
  | "loadMoreMallBoxes"
  | "refreshMallCatalog"
  | "setPageLoading"
  | "hasMoreBoxes"
  | "hasMoreMallBoxes"
  | "loadingMoreBoxes"
  | "loadingMoreMallBoxes"
  | "handleMallCategoryChange"
  | "handleMallSearch"
  | "homeBanner"
  | "openDetailsPage"
  | "selectedActivity"
  | "setSelectedActivity"
  | "boxesLoadError"
  | "mallLoadError"
  | "openNewcomerOffer"
>;

export type MainTabsCheckoutSlice = Pick<
  MainTabsBuildInput,
  | "addresses"
  | "addressesLoading"
  | "addressesLoadError"
  | "selectedAddressId"
  | "setSelectedAddressId"
  | "creatingOrder"
  | "openAddressFormPage"
  | "quote"
  | "quotingPrice"
  | "quoteError"
  | "retryQuote"
  | "availableCoupons"
  | "selectedCouponUserId"
  | "setSelectedCouponUserId"
  | "openAddressForm"
  | "loadAddresses"
  | "onSetDefaultAddress"
  | "onDeleteAddress"
  | "drawCount"
  | "setDrawCount"
  | "createOrder"
  | "pendingCheckoutResume"
  | "setPendingCheckoutResume"
  | "spendLimitRefreshKey"
>;

export type MainTabsOrdersSlice = Pick<
  MainTabsBuildInput,
  | "selectedOrder"
  | "setSelectedOrder"
  | "orders"
  | "ordersReady"
  | "loadOrders"
  | "loadOrdersDebounced"
  | "loadMoreOrders"
  | "hasMoreOrders"
  | "loadingMoreOrders"
  | "requestPayment"
  | "openOrderDetailsPage"
  | "refreshOrderDetails"
  | "cancelUnpaidOrder"
  | "redeemToBalance"
  | "confirmReceive"
  | "isUnpaidOrder"
  | "orderStatusFilter"
  | "autoRefreshOrders"
  | "orderKeyword"
  | "setOrderStatusFilter"
  | "setAutoRefreshOrders"
  | "setOrderKeyword"
  | "searchedOrders"
  | "onFilterByStatus"
  | "ordersLoadError"
>;

export type MainTabsAccountSlice = Pick<
  MainTabsBuildInput,
  | "couponCount"
  | "publicConfig"
  | "openFeaturePage"
  | "unreadMessageCount"
  | "refreshServerNotifications"
  | "setReadNotificationIds"
>;

export type MainTabsAddressFormSlice = Pick<
  MainTabsBuildInput,
  | "formRealName"
  | "formPhoneNumber"
  | "formRegion"
  | "formDistrict"
  | "formWard"
  | "formDetails"
  | "formHouseNumber"
  | "formIsDefault"
  | "setFormRealName"
  | "setFormPhoneNumber"
  | "setFormRegion"
  | "setFormDistrict"
  | "setFormWard"
  | "setFormDetails"
  | "setFormHouseNumber"
  | "setFormIsDefault"
  | "editingAddressId"
  | "savingAddress"
  | "saveAddress"
>;

export type AppMainTabsInputSlices = {
  nav: MainTabsNavSlice;
  auth: MainTabsAuthSlice;
  wallet: MainTabsWalletSlice;
  shell: MainTabsShellSlice;
  catalog: MainTabsCatalogSlice;
  catalogSearch: MainTabsCatalogSearchSlice;
  checkout: MainTabsCheckoutSlice;
  orders: MainTabsOrdersSlice;
  account: MainTabsAccountSlice;
  addressForm: MainTabsAddressFormSlice;
};
