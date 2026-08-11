import type { ComponentProps } from "react";
import type { AppModals, OrderResultState } from "../components/AppModals";
import { MOCK_PAYMENT_ENABLED } from "../config/constants";
import type { MysteryBox, PrepayResult, Product, VNPayPrepayResult, MoMoPrepayResult } from "../types";
import { getOrderById } from "../services/orderService";
import { isUnpaidOrder } from "../order-utils";
import { registerPaymentShellBridge } from "../payment/paymentShellBridge";
import { clearRevealSpectatorShareToken } from "../utils/revealSpectatorTokenBridge";
import { clearFairnessRouteSticky, setPendingFairnessRoute } from "../navigation/fairnessRouteContext";
import { releaseRevealSession } from "../effects/revealOrchestrator";
import { resolveBoxForOrderRetry } from "./orderResultState";
import { toast } from "../utils/toast";
import i18n from "../i18n";

// Owned by the modal component so the props it accepts and the state callers hold cannot drift apart.
export type { OrderResultState };

export type AppModalsBuildInput = {
  token: string;
  newcomerVisible: boolean;
  onNewcomerClose: () => void;
  onNewcomerBuy: (box: MysteryBox) => void;
  paymentSession: { orderId: string; payAmount: number } | null;
  setPaymentSession: (value: { orderId: string; payAmount: number } | null) => void;
  executeMockPayment: (orderId: string) => Promise<void>;
  prepaySession: { orderId: string; payAmount: number; prepay: PrepayResult } | null;
  setPrepaySession: (value: { orderId: string; payAmount: number; prepay: PrepayResult } | null) => void;
  vnpaySession: { orderId: string; payAmount: number; prepay: VNPayPrepayResult } | null;
  setVnpaySession: (value: { orderId: string; payAmount: number; prepay: VNPayPrepayResult } | null) => void;
  momoSession: { orderId: string; payAmount: number; prepay: MoMoPrepayResult } | null;
  setMomoSession: (value: { orderId: string; payAmount: number; prepay: MoMoPrepayResult } | null) => void;
  paymentErrorSession: import("./useAppPaymentShell").PaymentErrorSession | null;
  setPaymentErrorSession: (value: import("./useAppPaymentShell").PaymentErrorSession | null) => void;
  requestPayment: (orderId: string, payAmount?: number, wallet?: "default" | "momo", freshPrepay?: boolean) => Promise<void>;
  payWithPrepay: (orderId: string, prepay: import("../types").PrepayResult) => Promise<boolean>;
  onPaymentConfirmed: (orderId: string) => Promise<void>;
  showAddressModal: boolean;
  setShowAddressModal: (visible: boolean) => void;
  editingAddressId: string | null;
  formRealName: string;
  formPhoneNumber: string;
  formRegion: string;
  formDistrict: string;
  formWard: string;
  formDetails: string;
  formHouseNumber: string;
  savingAddress: boolean;
  setFormRealName: (v: string) => void;
  setFormPhoneNumber: (v: string) => void;
  setFormRegion: (v: string) => void;
  setFormDistrict: (v: string) => void;
  setFormWard: (v: string) => void;
  setFormDetails: (v: string) => void;
  setFormHouseNumber: (v: string) => void;
  resetForm: () => void;
  saveAddress: () => void | Promise<void>;
  orderResult: OrderResultState;
  setOrderResult: (value: OrderResultState) => void;
  activeBox: MysteryBox | null;
  setActiveBox: (box: MysteryBox | null) => void;
  navigate: (
    view: import("../components/MainTabsView").AppView,
    options?: import("./useAppNavigation").NavigateOptions,
  ) => void;
  createOrder: (
    drawMode?: import("../services/orderService").DrawMode,
    slotNo?: number,
    boxOverride?: MysteryBox | null,
    drawCountOverride?: number,
  ) => void;
  openOrderDetailsPage: (orderId: string) => void | Promise<void>;
  sharePosterVisible: boolean;
  setSharePosterVisible: (visible: boolean) => void;
};

export function buildAppModalsProps(input: AppModalsBuildInput): ComponentProps<typeof AppModals> {
  const {
    token,
    newcomerVisible,
    onNewcomerClose,
    onNewcomerBuy,
    paymentSession,
    setPaymentSession,
    executeMockPayment,
    prepaySession,
    setPrepaySession,
    vnpaySession,
    setVnpaySession,
    momoSession,
    setMomoSession,
    paymentErrorSession,
    setPaymentErrorSession,
    requestPayment,
    payWithPrepay,
    onPaymentConfirmed,
    showAddressModal,
    setShowAddressModal,
    editingAddressId,
    formRealName,
    formPhoneNumber,
    formRegion,
    formDistrict,
    formWard,
    formDetails,
    formHouseNumber,
    savingAddress,
    setFormRealName,
    setFormPhoneNumber,
    setFormRegion,
    setFormDistrict,
    setFormWard,
    setFormDetails,
    setFormHouseNumber,
    resetForm,
    saveAddress,
    orderResult,
    setOrderResult,
    activeBox,
    setActiveBox,
    navigate,
    createOrder,
    openOrderDetailsPage,
    sharePosterVisible,
    setSharePosterVisible,
  } = input;

  registerPaymentShellBridge({
    dismissVnpayCheckout: () => setVnpaySession(null),
    dismissMomoCheckout: () => setMomoSession(null),
    confirmPaymentSuccess: onPaymentConfirmed,
    peekOrderResult: () =>
      orderResult && !orderResult.pendingPayment
        ? { orderId: orderResult.orderId, boxId: orderResult.boxId }
        : null,
  });

  return {
    token,
    newcomerVisible,
    onNewcomerClose,
    onNewcomerBuy,
    paymentSession,
    onClosePayment: () => setPaymentSession(null),
    onConfirmMockPay: async () => {
      if (!paymentSession) return;
      await executeMockPayment(paymentSession.orderId);
      setPaymentSession(null);
    },
    prepaySession,
    onClosePrepay: () => setPrepaySession(null),
    onRetryPrepay: () => {
      if (!prepaySession) return;
      void requestPayment(prepaySession.orderId, prepaySession.payAmount);
    },
    onRetentionReprepay: async ({ orderId, payAmount }) => {
      // Drop stale gateway payloads so the next prepay uses post-claim amount.
      setPrepaySession(null);
      setVnpaySession(null);
      setMomoSession(null);
      if (MOCK_PAYMENT_ENABLED) {
        setPaymentSession({ orderId, payAmount });
        return;
      }
      // freshPrepay=true → new idempotency seed, avoid replaying full-amount cached prepay.
      await requestPayment(orderId, payAmount, undefined, true);
    },
    onPayFromPrepay: async () => {
      if (!prepaySession?.prepay) {
        return;
      }
      const paid = await payWithPrepay(prepaySession.orderId, prepaySession.prepay);
      if (paid) {
        setPrepaySession(null);
      }
    },
    onMockPayFromPrepay: async () => {
      if (!prepaySession) return;
      const { orderId } = prepaySession;
      setPrepaySession(null);
      await executeMockPayment(orderId);
    },
    vnpaySession,
    onCloseVnpay: () => setVnpaySession(null),
    onRetryVnpay: () => {
      if (!vnpaySession) return;
      void requestPayment(vnpaySession.orderId, vnpaySession.payAmount);
    },
    onRefreshVnpayStatus: async () => {
      if (!vnpaySession) return false;
      try {
        const order = await getOrderById(token, vnpaySession.orderId);
        return !isUnpaidOrder(order);
      } catch {
        return false;
      }
    },
    onVnpayPaid: async () => {
      if (!vnpaySession) return;
      const { orderId } = vnpaySession;
      setVnpaySession(null);
      await onPaymentConfirmed(orderId);
    },
    onMockPayFromVnpay:
      MOCK_PAYMENT_ENABLED && __DEV__
        ? async () => {
            if (!vnpaySession) return;
            const { orderId } = vnpaySession;
            setVnpaySession(null);
            await executeMockPayment(orderId);
          }
        : undefined,
    momoSession,
    onCloseMomo: () => setMomoSession(null),
    onRetryMomo: () => {
      if (!momoSession) return;
      void requestPayment(momoSession.orderId, momoSession.payAmount);
    },
    onMomoPaid: async () => {
      if (!momoSession) return;
      const { orderId } = momoSession;
      setMomoSession(null);
      await onPaymentConfirmed(orderId);
    },
    onRefreshMomoStatus: async () => {
      if (!momoSession) return false;
      try {
        const order = await getOrderById(token, momoSession.orderId);
        return !isUnpaidOrder(order);
      } catch {
        return false;
      }
    },
    paymentErrorSession,
    onClosePaymentError: () => setPaymentErrorSession(null),
    onRetryPaymentError: () => {
      if (!paymentErrorSession) return;
      const { orderId, payAmount } = paymentErrorSession;
      setPaymentErrorSession(null);
      void requestPayment(orderId, payAmount);
    },
    showAddressModal,
    editingAddressId,
    formRealName,
    formPhoneNumber,
    formRegion,
    formDistrict,
    formWard,
    formDetails,
    formHouseNumber,
    savingAddress,
    onChangeRealName: setFormRealName,
    onChangePhoneNumber: setFormPhoneNumber,
    onChangeRegion: setFormRegion,
    onChangeDistrict: setFormDistrict,
    onChangeWard: setFormWard,
    onChangeDetails: setFormDetails,
    onChangeHouseNumber: setFormHouseNumber,
    onCancelAddress: () => {
      setShowAddressModal(false);
      resetForm();
    },
    onSaveAddress: saveAddress,
    orderResult,
    onCloseOrderResult: () => {
      if (orderResult?.orderId) {
        clearRevealSpectatorShareToken(orderResult.orderId);
        releaseRevealSession(orderResult.orderId, "dismiss");
      }
      clearFairnessRouteSticky();
      setOrderResult(null);
    },
    onViewOrdersFromResult: () => {
      clearFairnessRouteSticky();
      setOrderResult(null);
      setActiveBox(null);
      navigate("orders");
    },
    onPayFromResult: () => {
      if (!orderResult) return;
      const { orderId, payAmount } = orderResult;
      void requestPayment(orderId, payAmount);
    },
    onTryAgainFromResult: () => {
      if (!orderResult) return;
      releaseRevealSession(orderResult.orderId, "dismiss");
      setPaymentSession(null);
      const retryDrawCount = orderResult.drawCount > 0 ? orderResult.drawCount : 1;
      const box = resolveBoxForOrderRetry(activeBox, orderResult);
      if (!box?.id) {
        toast.error(i18n.t("orderActions.retryNeedsBox"));
        return;
      }
      setActiveBox(box);
      setSharePosterVisible(false);
      setOrderResult(null);
      void createOrder(undefined, undefined, box, retryDrawCount);
    },
    onGoWarehouseFromResult: () => {
      clearFairnessRouteSticky();
      setOrderResult(null);
      setActiveBox(null);
      navigate("warehouse");
    },
    onVerifyFairnessFromResult: () => {
      if (!orderResult || orderResult.pendingPayment) return;
      const { orderId, boxId } = orderResult;
      setPendingFairnessRoute({ orderId, mysteryBoxId: boxId });
      // Keep Expo Router on the current tab so back from verify does not desync stacks.
      navigate("fairnessVerify", { skipRouterSync: true });
    },
    onShareFromResult: () => setSharePosterVisible(true),
    sharePosterVisible,
    sharePosterOrderResult: orderResult,
    onCloseSharePoster: () => {
      if (orderResult?.orderId) clearRevealSpectatorShareToken(orderResult.orderId);
      setSharePosterVisible(false);
    },
  };
}
