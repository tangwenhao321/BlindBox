import { useEffect, useMemo, useRef, useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import { useAppOrderActions } from "./useAppOrderActions";
import { useAppAddressActions } from "./useAppAddressActions";
import { useAppCouponSelection } from "./useAppCouponSelection";
import { useAddressForm } from "./useAddressForm";
import { useBoxPriceQuote } from "./useBoxPriceQuote";
import { useOrders } from "./useOrders";
import type { useAppPaymentShell } from "./useAppPaymentShell";
import type { Address, MysteryBox, Order } from "../types";

export type AppCheckoutOrchestrationInput = {
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
  loadOrders: (token: string) => Promise<void>;
  loadOrdersDebounced: (token: string) => void | Promise<void>;
  loadMoreOrders: (token: string) => Promise<void>;
  hasMoreOrders: boolean;
  loadingMoreOrders: boolean;
  ordersLoadError: string | null;
  loadBalanceLogs: (token?: string) => Promise<void>;
  refreshBalance: (usingToken?: string) => Promise<number | void>;
  paymentShell: ReturnType<typeof useAppPaymentShell>;
  setPageLoading: (value: boolean) => void;
};

export function useAppCheckoutOrchestration(input: AppCheckoutOrchestrationInput) {
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
  } = input;

  const [creatingOrder, setCreatingOrder] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [drawCount, setDrawCount] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [pendingCheckoutResume, setPendingCheckoutResume] = useState(false);
  const prevViewRef = useRef(view);
  const [spendLimitRefreshKey, setSpendLimitRefreshKey] = useState(0);

  useEffect(() => {
    if (prevViewRef.current === "settings" && view === "boxDetails" && activeBox) {
      setSpendLimitRefreshKey((key) => key + 1);
    }
    prevViewRef.current = view;
  }, [view, activeBox]);

  const {
    availableCoupons,
    selectedCouponUserId,
    setSelectedCouponUserId,
    loadAvailableCoupons,
    resetCouponSelection,
    applySuggestedCouponFromQuote,
  } = useAppCouponSelection(token);

  const { quote, quoting: quotingPrice, quoteError } = useBoxPriceQuote(
    token,
    activeBox?.id,
    "",
    drawCount,
    selectedCouponUserId || undefined,
  );

  useEffect(() => {
    applySuggestedCouponFromQuote(quote);
  }, [quote?.suggestedCouponUserId, applySuggestedCouponFromQuote, quote]);

  const orderState = useOrders(orders);
  const {
    orderStatusFilter,
    autoRefreshOrders,
    orderKeyword,
    filteredOrders: searchedOrders,
    setOrderStatusFilter,
    setAutoRefreshOrders,
    setOrderKeyword,
  } = orderState;

  const addressForm = useAddressForm();
  const {
    editingAddressId,
    setEditingAddressId,
    formRealName,
    setFormRealName,
    formPhoneNumber,
    setFormPhoneNumber,
    formRegion,
    setFormRegion,
    formDistrict,
    setFormDistrict,
    formWard,
    setFormWard,
    formDetails,
    setFormDetails,
    formHouseNumber,
    setFormHouseNumber,
    formIsDefault,
    setFormIsDefault,
    fillForm,
    resetForm,
  } = addressForm;

  const orderActions = useAppOrderActions({
    token,
    paymentShell,
    activeBox,
    selectedAddressId,
    drawCount,
    selectedCouponUserId,
    navigate,
    setSelectedOrder,
    setOrderStatusFilter,
    setPageLoading,
    setSavingAddress,
    setCreatingOrder,
    setShowAddressModal,
    setActiveBox,
    setDrawCount,
    loadAddresses,
    loadOrders,
    loadBalanceLogs,
    refreshBalance,
    orders: input.orders,
  });

  const {
    openDetails,
    saveAddressAction,
    openOrderDetailsPage,
    refreshOrderDetails,
    requestPayment,
    payWithPrepay,
    executeMockPayment,
    redeemToBalance,
    confirmReceive,
    cancelUnpaidOrder,
    createOrder,
    onFilterByStatus,
    isUnpaidOrder,
    confirmPaymentSuccess,
  } = orderActions;

  const {
    openAddressForm,
    openAddressFormPage,
    onSetDefaultAddress,
    onDeleteAddress,
    saveAddress,
  } = useAppAddressActions({
    token,
    view,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    loadAddresses,
    editingAddressId,
    setEditingAddressId,
    pendingCheckoutResume,
    setPendingCheckoutResume,
    formRealName,
    formPhoneNumber,
    formRegion,
    formDistrict,
    formWard,
    formDetails,
    formHouseNumber,
    formIsDefault,
    fillForm,
    setShowAddressModal,
    goBack,
    navigate,
    saveAddressAction,
  });

  return {
    creatingOrder,
    showAddressModal,
    setShowAddressModal,
    drawCount,
    setDrawCount,
    selectedOrder,
    setSelectedOrder,
    savingAddress,
    pendingCheckoutResume,
    setPendingCheckoutResume,
    spendLimitRefreshKey,
    availableCoupons,
    selectedCouponUserId,
    setSelectedCouponUserId,
    loadAvailableCoupons,
    resetCouponSelection,
    applySuggestedCouponFromQuote,
    quote,
    quotingPrice,
    quoteError,
    orderStatusFilter,
    autoRefreshOrders,
    orderKeyword,
    searchedOrders,
    setOrderStatusFilter,
    setAutoRefreshOrders,
    setOrderKeyword,
    editingAddressId,
    formRealName,
    setFormRealName,
    formPhoneNumber,
    setFormPhoneNumber,
    formRegion,
    setFormRegion,
    formDistrict,
    setFormDistrict,
    formWard,
    setFormWard,
    formDetails,
    setFormDetails,
    formHouseNumber,
    setFormHouseNumber,
    formIsDefault,
    setFormIsDefault,
    resetForm,
    openDetails,
    openAddressForm,
    openAddressFormPage,
    onSetDefaultAddress,
    onDeleteAddress,
    saveAddress,
    openOrderDetailsPage,
    refreshOrderDetails,
    requestPayment,
    payWithPrepay,
    executeMockPayment,
    redeemToBalance,
    confirmReceive,
    cancelUnpaidOrder,
    createOrder,
    onFilterByStatus,
    isUnpaidOrder,
    confirmPaymentSuccess,
    loadOrdersDebounced,
    loadMoreOrders,
    hasMoreOrders,
    loadingMoreOrders,
    ordersLoadError,
  };
}
