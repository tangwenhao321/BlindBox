import { useCallback, useRef } from "react";
import { normalizePrizeProducts } from "../effects/normalize";
import { getOrderById } from "../services/orderService";
import { isUnpaidOrder } from "../order-utils";
import i18n from "../i18n";
import { toast } from "../utils/toast";
import { addCrashMonitoringBreadcrumb } from "../utils/crashMonitoring";
import type { AppView } from "../components/mainTabs/appViews";
import type { NavigateOptions } from "./useAppNavigation";
import type { MysteryBox, Order } from "../types";
import { useAppActions } from "./useAppActions";
import type { useAppPaymentShell } from "./useAppPaymentShell";
import { prepareFreshRevealPlayback } from "../effects/revealOrchestrator";
import { resetRevealDriverTierForPaidReveal } from "../effects/revealDriverTier";
import { scheduleWarehouseCoachStep, markOnboardingCoachDone } from "../utils/onboardingCoachStorage";
import { hasOpenedBlindBox, markUserHasPurchased } from "../utils/newcomerOffer";
import {
  invalidateBoxAuxiliaryQueries,
  invalidateHomeSummaryQueries,
  invalidateOrderQueries,
  invalidatePurchaseLimitQueries,
} from "../utils/invalidateAppQueries";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import { fetchOrderPaymentMeta } from "../services/orderPaymentService";
import { getRetentionOrderId, clearRetentionOrderId } from "../utils/retentionStorage";
import { getLastPaymentChannel } from "../payment/paymentChannelMemory";

type PaymentShell = ReturnType<typeof useAppPaymentShell>;

type Params = {
  token: string;
  paymentShell: PaymentShell;
  activeBox: MysteryBox | null;
  selectedAddressId: string;
  drawCount: number;
  selectedCouponUserId: string;
  navigate: (view: AppView, options?: NavigateOptions) => void;
  setSelectedOrder: (order: Order | null) => void;
  setOrderStatusFilter: (status: string) => void;
  setPageLoading: (value: boolean) => void;
  setSavingAddress: (value: boolean) => void;
  setCreatingOrder: (value: boolean) => void;
  setShowAddressModal: (value: boolean) => void;
  setActiveBox: (box: MysteryBox | null) => void;
  setDrawCount: (count: number) => void;
  loadAddresses: (token: string) => Promise<void>;
  loadOrders: (token: string) => Promise<void>;
  loadBalanceLogs: (token: string) => Promise<void>;
  refreshBalance: (token: string) => Promise<number | void>;
  orders: Order[];
};

export function useAppOrderActions(params: Params) {
  const {
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
    orders,
  } = params;

  const findUnpaidOrderForBox = useCallback(
    (boxId: string) =>
      orders.find((order) => {
        if (!isUnpaidOrder(order)) return false;
        const itemBoxId = order.items?.[0]?.mysteryBoxId ?? order.items?.[0]?.mysteryBox?.id;
        return itemBoxId === boxId;
      }),
    [orders],
  );

  const navigateToOrderDetailsRef = useRef<(orderId: string) => Promise<void>>(async () => undefined);

  const {
    setPaymentSession,
    setPrepaySession,
    setVnpaySession,
    setMomoSession,
    onOrderCreated,
    onPaymentSuccess: clearPendingPayment,
    onCancelUnpaid: clearPendingOnCancel,
    markOrderResultPaid,
    setPaymentErrorSession,
    orderResult,
    setOrderResult,
  } = paymentShell;

  const confirmPaymentSuccess = useCallback(
    async (orderId: string) => {
      addCrashMonitoringBreadcrumb("payment", "payment_success", { orderId });
      let retentionClaimed = false;
      let retentionDiscount = 0;
      try {
        const meta = await fetchOrderPaymentMeta(token, orderId);
        retentionClaimed = !!meta?.retentionClaimed;
        retentionDiscount = Number(meta?.retentionDiscountAmount ?? 0);
      } catch {
        // ignore meta failures for analytics
      }
      const storedRetentionOrderId = await getRetentionOrderId();
      if (!retentionClaimed && storedRetentionOrderId === orderId) {
        retentionClaimed = true;
      }
      const channel = getLastPaymentChannel();
      trackEvent(ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
        orderId,
        channel,
        retentionClaimed,
        retentionDiscount,
      });
      if (retentionClaimed) {
        trackEvent(ANALYTICS_EVENTS.RETENTION_CONVERTED, {
          orderId,
          channel,
          discountAmount: retentionDiscount,
        });
      }
      if (storedRetentionOrderId === orderId) {
        await clearRetentionOrderId();
      }
      prepareFreshRevealPlayback(orderId);
      resetRevealDriverTierForPaidReveal();
      let order = await getOrderById(token, orderId);
      let prizes = normalizePrizeProducts(order);
      for (let attempt = 0; prizes.length === 0 && attempt < 4; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        order = await getOrderById(token, orderId);
        prizes = normalizePrizeProducts(order);
      }
      markOrderResultPaid(orderId, prizes, order);
      await clearPendingPayment();
      await markUserHasPurchased();
      await markOnboardingCoachDone();
      const experienced = hasOpenedBlindBox(orders);
      if (!experienced) {
        void scheduleWarehouseCoachStep(false);
      }
      const boxId = order.items?.[0]?.mysteryBoxId ?? order.items?.[0]?.mysteryBox?.id;
      await invalidateOrderQueries(token);
      invalidateHomeSummaryQueries(token);
      if (boxId) {
        invalidatePurchaseLimitQueries(token, boxId);
        invalidateBoxAuxiliaryQueries(token, boxId);
      }
      toast.success(i18n.t("orderActions.paySuccessRevealed"));
    },
    [clearPendingPayment, markOrderResultPaid, orders, token],
  );

  const {
    openDetails,
    saveAddress: saveAddressAction,
    createOrder: createOrderAction,
    cancelUnpaidOrder: cancelUnpaidOrderAction,
    openOrderDetails,
    requestPayment,
    payWithPrepay,
    executeMockPayment,
    redeemToBalance,
    confirmReceive,
  } = useAppActions({
    token,
    setPageLoading,
    setSavingAddress,
    setCreatingOrder,
    setShowAddressModal,
    setActiveBox,
    setDrawCount,
    setSelectedOrder,
    loadAddresses,
    loadOrders,
    onRedeemSuccess: async () => {
      await loadBalanceLogs(token);
      return refreshBalance(token);
    },
    onOrderCreated,
    onPaymentRequest: (payload) => setPaymentSession(payload),
    onPrepayReady: (payload) => setPrepaySession(payload),
    onVnpayPrepayReady: (payload) => setVnpaySession(payload),
    onMoMoPrepayReady: (payload) => setMomoSession(payload),
    onPrepayFail: (payload) => setPaymentErrorSession(payload),
    onPaymentSuccess: confirmPaymentSuccess,
    onSupersedeUnpaidOrder: async (orderId) => {
      setPaymentSession(null);
      await clearPendingOnCancel();
      if (orderResult?.orderId === orderId && orderResult.pendingPayment) {
        setOrderResult(null);
      }
    },
    findUnpaidOrderForBox,
  });

  const openOrderDetailsPage = useCallback(
    async (id: string) => {
      const ok = await openOrderDetails(id);
      if (ok) navigate("orderDetails", { orderId: id });
    },
    [navigate, openOrderDetails],
  );

  navigateToOrderDetailsRef.current = openOrderDetailsPage;

  const cancelUnpaidOrder = useCallback(
    async (orderId: string) => {
      await cancelUnpaidOrderAction(orderId);
      await clearPendingOnCancel();
    },
    [cancelUnpaidOrderAction, clearPendingOnCancel],
  );

  const createOrder = useCallback(
    (
      drawMode: import("../services/orderService").DrawMode = "instant",
      slotNo?: number,
      boxOverride?: MysteryBox | null,
      drawCountOverride?: number,
    ) => {
      const box = boxOverride ?? activeBox;
      if (!box) {
        toast.error(i18n.t("orderActions.retryNeedsBox"));
        return;
      }
      const resolvedDrawCount =
        drawCountOverride && drawCountOverride > 0 ? drawCountOverride : drawCount;
      if (resolvedDrawCount <= 0) {
        toast.error(i18n.t("orderActions.invalidDrawCount"));
        return;
      }
      createOrderAction({
        box,
        selectedAddressId,
        drawCount: resolvedDrawCount,
        couponUserId: selectedCouponUserId || undefined,
        drawMode,
        slotNo,
        skipConfirm: true,
      });
    },
    [activeBox, createOrderAction, drawCount, selectedAddressId, selectedCouponUserId],
  );

  const onFilterByStatus = useCallback(
    (status: string) => {
      const normalized = !status || status === "ALL" ? "ALL" : status;
      setOrderStatusFilter(normalized);
      setSelectedOrder(null);
      navigate("orders");
      void loadOrders(token);
    },
    [loadOrders, navigate, setOrderStatusFilter, setSelectedOrder, token],
  );

  const refreshOrderDetails = useCallback(
    async (id: string) => {
      await openOrderDetails(id, { silent: true });
    },
    [openOrderDetails],
  );

  return {
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
  };
}
