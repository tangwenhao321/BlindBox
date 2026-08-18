import { useMemo, type MutableRefObject } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import type { Address, MysteryBox, Order } from "../types";
import { useAppCheckoutOrchestration } from "./useAppCheckoutOrchestration";
import type { useAppPaymentShell } from "./useAppPaymentShell";
import type { useNewcomerOffer } from "./useNewcomerOffer";
import type {
  MainTabsAddressFormSlice,
  MainTabsCheckoutSlice,
  MainTabsOrdersSlice,
} from "./mainTabsSliceTypes";
import type { AssembleAppControllerShellInput } from "./assembleAppControllerShellContext";

export type CheckoutControllerInput = {
  token: string;
  view: AppView;
  navigate: (view: AppView) => void;
  goBack: () => void;
  activeBox: MysteryBox | null;
  setActiveBox: (box: MysteryBox | null) => void;
  addresses: Address[];
  addressesLoading: boolean;
  addressesLoadError: string | null;
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  loadAddresses: (token: string) => Promise<void>;
  orders: Order[];
  ordersReady: boolean;
  loadOrders: (token: string) => Promise<void>;
  loadOrdersDebounced: (token: string) => void | Promise<void>;
  loadMoreOrders: (token: string) => Promise<void>;
  hasMoreOrders: boolean;
  loadingMoreOrders: boolean;
  ordersLoadError: string | null;
  loadBalanceLogs: (token?: string) => Promise<void>;
  refreshBalance: (usingToken?: string) => Promise<number | void>;
  paymentShell: ReturnType<typeof useAppPaymentShell>;
  newcomer: ReturnType<typeof useNewcomerOffer>;
  setPageLoading: (value: boolean) => void;
  openDetailsRef: MutableRefObject<(id: string) => Promise<unknown>>;
  resetCouponRef: MutableRefObject<() => void>;
  loadCouponsRef: MutableRefObject<() => Promise<void>>;
  openDetailsPage: (boxId: string) => void | Promise<void>;
};

export type CheckoutControllerResult = {
  checkout: ReturnType<typeof useAppCheckoutOrchestration>;
  checkoutSlice: MainTabsCheckoutSlice;
  orderListSlice: MainTabsOrdersSlice;
  addressFormSlice: MainTabsAddressFormSlice;
  shellSlice: AssembleAppControllerShellInput;
};

export function useCheckoutController(input: CheckoutControllerInput): CheckoutControllerResult {
  const {
    token,
    view,
    navigate,
    goBack,
    activeBox,
    setActiveBox,
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
    refreshBalance,
    paymentShell,
    newcomer,
    setPageLoading,
    openDetailsRef,
    resetCouponRef,
    loadCouponsRef,
    openDetailsPage,
  } = input;

  const checkout = useAppCheckoutOrchestration({
    token,
    view,
    navigate,
    goBack,
    activeBox,
    setActiveBox,
    addresses,
    addressesLoading,
    addressesLoadError,
    selectedAddressId,
    setSelectedAddressId,
    loadAddresses,
    orders,
    loadOrders,
    loadOrdersDebounced,
    loadMoreOrders,
    hasMoreOrders,
    loadingMoreOrders,
    ordersLoadError,
    loadBalanceLogs,
    refreshBalance,
    paymentShell,
    setPageLoading,
  });

  openDetailsRef.current = checkout.openDetails;
  resetCouponRef.current = checkout.resetCouponSelection;
  loadCouponsRef.current = checkout.loadAvailableCoupons;

  const checkoutSlice = useMemo<MainTabsCheckoutSlice>(
    () => ({
      addresses,
      addressesLoading,
      addressesLoadError,
      selectedAddressId,
      setSelectedAddressId,
      creatingOrder: checkout.creatingOrder,
      openAddressFormPage: checkout.openAddressFormPage,
      quote: checkout.quote,
      quotingPrice: checkout.quotingPrice,
      quoteError: checkout.quoteError,
      retryQuote: checkout.retryQuote,
      availableCoupons: checkout.availableCoupons,
      selectedCouponUserId: checkout.selectedCouponUserId,
      setSelectedCouponUserId: checkout.setSelectedCouponUserId,
      openAddressForm: checkout.openAddressForm,
      loadAddresses,
      onSetDefaultAddress: checkout.onSetDefaultAddress,
      onDeleteAddress: checkout.onDeleteAddress,
      drawCount: checkout.drawCount,
      setDrawCount: checkout.setDrawCount,
      createOrder: checkout.createOrder,
      pendingCheckoutResume: checkout.pendingCheckoutResume,
      setPendingCheckoutResume: checkout.setPendingCheckoutResume,
      spendLimitRefreshKey: checkout.spendLimitRefreshKey,
    }),
    [
      addresses,
      addressesLoading,
      addressesLoadError,
      selectedAddressId,
      setSelectedAddressId,
      checkout.creatingOrder,
      checkout.openAddressFormPage,
      checkout.quote,
      checkout.quotingPrice,
      checkout.quoteError,
      checkout.retryQuote,
      checkout.availableCoupons,
      checkout.selectedCouponUserId,
      checkout.setSelectedCouponUserId,
      checkout.openAddressForm,
      loadAddresses,
      checkout.onSetDefaultAddress,
      checkout.onDeleteAddress,
      checkout.drawCount,
      checkout.setDrawCount,
      checkout.createOrder,
      checkout.pendingCheckoutResume,
      checkout.setPendingCheckoutResume,
      checkout.spendLimitRefreshKey,
    ],
  );

  const orderListSlice = useMemo<MainTabsOrdersSlice>(
    () => ({
      selectedOrder: checkout.selectedOrder,
      setSelectedOrder: checkout.setSelectedOrder,
      orders,
      ordersReady,
      loadOrders,
      loadOrdersDebounced,
      loadMoreOrders,
      hasMoreOrders,
      loadingMoreOrders,
      requestPayment: checkout.requestPayment,
      openOrderDetailsPage: checkout.openOrderDetailsPage,
      refreshOrderDetails: checkout.refreshOrderDetails,
      cancelUnpaidOrder: checkout.cancelUnpaidOrder,
      redeemToBalance: checkout.redeemToBalance,
      confirmReceive: checkout.confirmReceive,
      isUnpaidOrder: checkout.isUnpaidOrder,
      orderStatusFilter: checkout.orderStatusFilter,
      autoRefreshOrders: checkout.autoRefreshOrders,
      orderKeyword: checkout.orderKeyword,
      setOrderStatusFilter: checkout.setOrderStatusFilter,
      setAutoRefreshOrders: checkout.setAutoRefreshOrders,
      setOrderKeyword: checkout.setOrderKeyword,
      searchedOrders: checkout.searchedOrders,
      onFilterByStatus: checkout.onFilterByStatus,
      ordersLoadError,
    }),
    [
      checkout.selectedOrder,
      checkout.setSelectedOrder,
      orders,
      ordersReady,
      loadOrders,
      loadOrdersDebounced,
      loadMoreOrders,
      hasMoreOrders,
      loadingMoreOrders,
      checkout.requestPayment,
      checkout.openOrderDetailsPage,
      checkout.refreshOrderDetails,
      checkout.cancelUnpaidOrder,
      checkout.redeemToBalance,
      checkout.confirmReceive,
      checkout.isUnpaidOrder,
      checkout.orderStatusFilter,
      checkout.autoRefreshOrders,
      checkout.orderKeyword,
      checkout.setOrderStatusFilter,
      checkout.setAutoRefreshOrders,
      checkout.setOrderKeyword,
      checkout.searchedOrders,
      checkout.onFilterByStatus,
      ordersLoadError,
    ],
  );

  const addressFormSlice = useMemo<MainTabsAddressFormSlice>(
    () => ({
      formRealName: checkout.formRealName,
      formPhoneNumber: checkout.formPhoneNumber,
      formRegion: checkout.formRegion,
      formDistrict: checkout.formDistrict,
      formWard: checkout.formWard,
      formDetails: checkout.formDetails,
      formHouseNumber: checkout.formHouseNumber,
      formIsDefault: checkout.formIsDefault,
      setFormRealName: checkout.setFormRealName,
      setFormPhoneNumber: checkout.setFormPhoneNumber,
      setFormRegion: checkout.setFormRegion,
      setFormDistrict: checkout.setFormDistrict,
      setFormWard: checkout.setFormWard,
      setFormDetails: checkout.setFormDetails,
      setFormHouseNumber: checkout.setFormHouseNumber,
      setFormIsDefault: checkout.setFormIsDefault,
      editingAddressId: checkout.editingAddressId,
      savingAddress: checkout.savingAddress,
      saveAddress: checkout.saveAddress,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [
      checkout.formRealName,
      checkout.formPhoneNumber,
      checkout.formRegion,
      checkout.formDistrict,
      checkout.formWard,
      checkout.formDetails,
      checkout.formHouseNumber,
      checkout.formIsDefault,
      checkout.setFormRealName,
      checkout.setFormPhoneNumber,
      checkout.setFormRegion,
      checkout.setFormDetails,
      checkout.setFormHouseNumber,
      checkout.setFormIsDefault,
      checkout.editingAddressId,
      checkout.savingAddress,
      checkout.saveAddress,
    ],
  );

  const shellSlice = useMemo<AssembleAppControllerShellInput>(
    () => ({
      token,
      newcomer,
      openDetailsPage,
      paymentShell,
      executeMockPayment: checkout.executeMockPayment,
      requestPayment: checkout.requestPayment,
      payWithPrepay: checkout.payWithPrepay,
      onPaymentConfirmed: checkout.confirmPaymentSuccess,
      showAddressModal: checkout.showAddressModal,
      setShowAddressModal: checkout.setShowAddressModal,
      editingAddressId: checkout.editingAddressId,
      formRealName: checkout.formRealName,
      formPhoneNumber: checkout.formPhoneNumber,
      formRegion: checkout.formRegion,
      formDistrict: checkout.formDistrict,
      formWard: checkout.formWard,
      formDetails: checkout.formDetails,
      formHouseNumber: checkout.formHouseNumber,
      savingAddress: checkout.savingAddress,
      setFormRealName: checkout.setFormRealName,
      setFormPhoneNumber: checkout.setFormPhoneNumber,
      setFormRegion: checkout.setFormRegion,
      setFormDistrict: checkout.setFormDistrict,
      setFormWard: checkout.setFormWard,
      setFormDetails: checkout.setFormDetails,
      setFormHouseNumber: checkout.setFormHouseNumber,
      resetForm: checkout.resetForm,
      saveAddress: checkout.saveAddress,
      activeBox,
      setActiveBox,
      navigate,
      createOrder: checkout.createOrder,
      openOrderDetailsPage: checkout.openOrderDetailsPage,
      setPendingCheckoutResume: checkout.setPendingCheckoutResume,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [
      token,
      newcomer,
      openDetailsPage,
      paymentShell,
      checkout.executeMockPayment,
      checkout.requestPayment,
      checkout.payWithPrepay,
      checkout.confirmPaymentSuccess,
      checkout.showAddressModal,
      checkout.setShowAddressModal,
      checkout.editingAddressId,
      checkout.formRealName,
      checkout.formPhoneNumber,
      checkout.formRegion,
      checkout.formDistrict,
      checkout.formWard,
      checkout.formDetails,
      checkout.formHouseNumber,
      checkout.savingAddress,
      checkout.setFormRealName,
      checkout.setFormPhoneNumber,
      checkout.setFormRegion,
      checkout.setFormDetails,
      checkout.setFormHouseNumber,
      checkout.resetForm,
      checkout.saveAddress,
      activeBox,
      setActiveBox,
      navigate,
      checkout.createOrder,
      checkout.openOrderDetailsPage,
      checkout.setPendingCheckoutResume,
    ],
  );

  return {
    checkout,
    checkoutSlice,
    orderListSlice,
    addressFormSlice,
    shellSlice,
  };
}
