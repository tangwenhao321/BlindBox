import * as Haptics from "expo-haptics";
import { Alert } from "react-native";
import { parseError, toAppError } from "../api";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import i18n from "../i18n";
import { normalizePrizeProducts } from "../effects/normalize";
import { getBoxById } from "../services/boxService";
import { markOnboardingDone } from "../components/OnboardingOverlay";
import { markOnboardingCoachDone } from "../utils/onboardingCoachStorage";
import { markUserHasPurchased } from "../utils/newcomerOffer";
import { MOCK_PAYMENT_ENABLED } from "../config/constants";
import { resolvePaymentMode } from "../config/payment";
import {
  calculateOrderPrice,
  getOrderById,
  getWechatPrepayParams,
  getVNPayPrepayParams,
  getMoMoPrepayParams,
  retryWechatPrepayParams,
  retryVNPayPrepayParams,
  retryMoMoPrepayParams,
  isRiskConfirmRequired,
  mockPayOrder,
} from "../services/orderService";
import { clearRetentionOrderId, getRetentionOrderId } from "../utils/retentionStorage";
import { rememberPaymentChannel } from "../payment/paymentChannelMemory";
import { invokeWechatPay } from "../utils/wechatPay";
import type { PrepayResult, VNPayPrepayResult, MoMoPrepayResult , MysteryBox, Order } from "../types";
import { consumePendingPaymentWallet, peekPendingPaymentWallet } from "../payment/paymentWalletPreference";
import { validateAddressForm } from "../utils/addressValidation";
import { toast } from "../utils/toast";
import { isIosDigitalGoodsRestricted } from "../utils/iosDigitalGoodsGate";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import { formatCurrency } from "../utils/formatCurrency";
import { formatOrderIdShort, isUnpaidOrder } from "../order-utils";
import { reportAppError } from "../utils/crashReport";
import { blockOfflineSubmit, queueIfOffline } from "../utils/offlineSubmitGuard";
import { isOffline } from "../utils/connectivity";
import {
  applyPityCompensateChoice,
  isPityStockExhaustedError,
  resolveOrderBoxId,
} from "../utils/pityCompensate";
import { mergeAddressForSave } from "./useAddressForm";
import { fetchAgeCompliance } from "../services/complianceService";
import { useCancelOrderMutation } from "../query/mutations/useCancelOrderMutation";
import { useConfirmReceiveMutation } from "../query/mutations/useConfirmReceiveMutation";
import { useCreateOrderMutation } from "../query/mutations/useCreateOrderMutation";
import { useRedeemMutation } from "../query/mutations/useRedeemMutation";
import { useSaveAddressMutation } from "../query/mutations/useSaveAddressMutation";
import { invalidateOrderQueries } from "../utils/invalidateAppQueries";


const MOMO_ENABLED = process.env.EXPO_PUBLIC_MOMO_ENABLED === "true";

const PAYMENT_STALE_MS = 120_000;
const paymentStaleTimers = new Map<string, ReturnType<typeof setTimeout>>();

function armPaymentStaleWatch(orderId: string) {
  const existing = paymentStaleTimers.get(orderId);
  if (existing) clearTimeout(existing);
  paymentStaleTimers.set(
    orderId,
    setTimeout(() => {
      trackEvent("payment_stale", { orderId });
      paymentStaleTimers.delete(orderId);
    }, PAYMENT_STALE_MS),
  );
}

function clearPaymentStaleWatch(orderId: string) {
  const existing = paymentStaleTimers.get(orderId);
  if (existing) clearTimeout(existing);
  paymentStaleTimers.delete(orderId);
}

type Params = {
  token: string;
  setPageLoading: (value: boolean) => void;
  setSavingAddress: (value: boolean) => void;
  setCreatingOrder: (value: boolean) => void;
  setShowAddressModal: (value: boolean) => void;
  setActiveBox: (value: MysteryBox | null) => void;
  setDrawCount?: (count: number) => void;
  setSelectedOrder: (value: Order | null) => void;
  loadAddresses: (token: string) => Promise<void>;
  loadOrders: (token: string) => Promise<void>;
  onRedeemSuccess?: () => Promise<number | void> | number | void;
  onOrderCreated?: (payload: {
    orderId: string;
    drawCount: number;
    payAmount: number;
    boxName: string;
    boxId?: string;
    boxCategoryName?: string;
    boxCover?: string;
    pendingPayment: boolean;
  }) => void;
  onPaymentRequest?: (payload: { orderId: string; payAmount: number }) => void;
  onPrepayReady?: (payload: { orderId: string; payAmount: number; prepay: PrepayResult }) => void;
  onVnpayPrepayReady?: (payload: { orderId: string; payAmount: number; prepay: VNPayPrepayResult }) => void;
  onMoMoPrepayReady?: (payload: { orderId: string; payAmount: number; prepay: MoMoPrepayResult }) => void;
  onPrepayFail?: (payload: {
    orderId: string;
    payAmount: number;
    message: string;
    channel: "wechat" | "vnpay" | "momo";
  }) => void;
  onPaymentSuccess?: (orderId: string) => void | Promise<void>;
  onSupersedeUnpaidOrder?: (orderId: string) => void | Promise<void>;
  findUnpaidOrderForBox?: (boxId: string) => Order | undefined;
};

export type PaymentRequest = { orderId: string; payAmount: number };

export function useAppActions(params: Params) {
  const { confirm } = useConfirmDialog();
  const {
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
    onRedeemSuccess,
    onOrderCreated,
    onPaymentRequest,
    onPrepayReady,
    onVnpayPrepayReady,
    onMoMoPrepayReady,
    onPrepayFail,
    onPaymentSuccess,
    onSupersedeUnpaidOrder,
    findUnpaidOrderForBox,
  } = params;

  const createOrderMutation = useCreateOrderMutation(token);
  const cancelOrderMutation = useCancelOrderMutation(token);
  const confirmReceiveMutation = useConfirmReceiveMutation(token);
  const redeemMutation = useRedeemMutation(token);
  const saveAddressMutation = useSaveAddressMutation(token);

  const syncOrders = async () => {
    await invalidateOrderQueries(token);
    await loadOrders(token);
  };

  const syncAddresses = async () => {
    await loadAddresses(token);
  };

  const openDetails = async (id: string): Promise<MysteryBox | null> => {
    setPageLoading(true);
    try {
      const box = await getBoxById(token, id);
      setActiveBox(box);
      if (box?.newcomerExclusive) {
        setDrawCount?.(1);
      }
      return box;
    } catch (error) {
      toast.error(parseError(error));
      return null;
    } finally {
      setPageLoading(false);
    }
  };

  const saveAddress = async (payload: {
    id?: string;
    realName: string;
    phoneNumber: string;
    region?: string;
    district?: string;
    ward?: string;
    details: string;
    houseNumber: string;
    isFirstAddress: boolean;
  }) => {
    const validationError = validateAddressForm(payload);
    if (validationError) {
      toast.info(validationError);
      return;
    }
    const addressDetails = mergeAddressForSave({
      region: payload.region ?? "",
      district: payload.district,
      ward: payload.ward,
      details: payload.details,
    });
    const persistPayload = {
      kind: "saveAddress" as const,
      token,
      payload: {
        id: payload.id,
        realName: payload.realName,
        phoneNumber: payload.phoneNumber,
        details: addressDetails,
        houseNumber: payload.houseNumber,
        top: payload.isFirstAddress,
      },
    };
    const performSave = async () => {
      setSavingAddress(true);
      try {
        await saveAddressMutation.mutateAsync({
          id: payload.id,
          realName: payload.realName,
          phoneNumber: payload.phoneNumber,
          details: addressDetails,
          houseNumber: payload.houseNumber,
          top: payload.isFirstAddress,
        });
        trackEvent(ANALYTICS_EVENTS.ADDRESS_SAVE, { isEdit: Boolean(payload.id) });
        setShowAddressModal(false);
        await syncAddresses();
        toast.success(i18n.t("actions.addressSaved"));
      } catch (error) {
        reportAppError(toAppError(error), "save_address");
        toast.error(parseError(error));
      } finally {
        setSavingAddress(false);
      }
    };
    if (queueIfOffline("offline.actionSaveAddress", performSave, persistPayload)) return;
    await performSave();
  };

  const createOrder = async (payload: {
    box: MysteryBox | null;
    selectedAddressId?: string;
    drawCount: number;
    couponUserId?: string;
    drawMode?: import("../services/orderService").DrawMode;
    slotNo?: number;
    /** UI 已在确认订单弹窗二次确认时设为 true，避免重复 Alert */
    skipConfirm?: boolean;
  }) => {
    if (!payload.box) return;
    if (!payload.selectedAddressId) {
      toast.info(i18n.t("actions.addressRequired"));
      return;
    }
    if (blockOfflineSubmit("offline.actionOrder")) return;
    const existingUnpaid = findUnpaidOrderForBox?.(payload.box.id);
    if (existingUnpaid && isUnpaidOrder(existingUnpaid)) {
      const resumeExisting = await confirm({
        title: i18n.t("actions.resumeUnpaidTitle"),
        message: i18n.t("actions.resumeUnpaidMessage", {
          boxName: payload.box.name,
          orderId: formatOrderIdShort(existingUnpaid.id),
        }),
        confirmLabel: i18n.t("actions.resumeUnpaidPay"),
        cancelLabel: i18n.t("actions.resumeUnpaidNew"),
      });
      if (resumeExisting) {
        const payAmount = Number(existingUnpaid.baseOrder?.payment?.payAmount ?? 0);
        trackEvent("payment_start", { orderId: existingUnpaid.id, payAmount, resumeUnpaid: true, boxId: payload.box.id });
        if (onOrderCreated) {
          onOrderCreated({
            orderId: existingUnpaid.id,
            drawCount: payload.drawCount,
            payAmount,
            boxName: payload.box.name,
            boxId: payload.box.id,
            boxCategoryName: payload.box.category?.name,
            boxCover: payload.box.cover,
            pendingPayment: true,
          });
        }
        if (MOCK_PAYMENT_ENABLED && onPaymentRequest) {
          onPaymentRequest({ orderId: existingUnpaid.id, payAmount });
        } else {
          await requestPayment(existingUnpaid.id, payAmount);
        }
        return;
      }
      try {
        await cancelOrderMutation.mutateAsync(existingUnpaid.id);
        await syncOrders();
        await onSupersedeUnpaidOrder?.(existingUnpaid.id);
      } catch (error) {
        reportAppError(toAppError(error), "cancel_unpaid_before_new_order");
        toast.error(parseError(error));
        return;
      }
    }
    try {
      const ageOk = await fetchAgeCompliance(token);
      if (!ageOk) {
        toast.error(i18n.t("actions.ageRequired"));
        return;
      }
    } catch (error) {
      toast.error(parseError(error));
      return;
    }
    setCreatingOrder(true);
    try {
      const calc = await calculateOrderPrice(
        token,
        payload.box.id,
        payload.selectedAddressId || undefined,
        payload.drawCount,
        payload.couponUserId,
      );
      if (calc.couponAmount > 0) {
        trackEvent("coupon_apply", {
          boxId: payload.box.id,
          amount: calc.couponAmount,
          drawCount: payload.drawCount,
        });
      }
      if (!payload.skipConfirm) {
        const couponLine =
          calc.couponAmount > 0
            ? i18n.t("actions.orderConfirmCouponLine", { amount: formatCurrency(calc.couponAmount) })
            : "";
        const confirmed = await confirm({
          title: i18n.t("actions.orderConfirmTitle"),
          message: i18n.t("actions.orderConfirmMessage", {
            boxName: payload.box.name,
            drawCount: payload.drawCount,
            payAmount: formatCurrency(calc.payAmount),
            couponLine,
          }),
          confirmLabel: i18n.t("actions.orderConfirmBtn"),
        });
        if (!confirmed) {
          return;
        }
      }

      const box = payload.box;
      if (!box) return;

      const orderPersist = {
        kind: "createOrder" as const,
        token,
        payload: {
          boxId: box.id,
          addressId: payload.selectedAddressId || undefined,
          drawCount: payload.drawCount,
          couponUserId: payload.couponUserId,
          drawMode: payload.drawMode ?? "instant",
          slotNo: payload.slotNo,
          riskConfirm: false,
        },
      };

      const performSubmit = async () => {
        const submit = async (riskConfirm?: boolean) =>
          createOrderMutation.mutateAsync({
            boxId: box.id,
            addressId: payload.selectedAddressId || undefined,
            drawCount: payload.drawCount,
            riskConfirm,
            couponUserId: payload.couponUserId,
            drawMode: payload.drawMode ?? "instant",
          slotNo: payload.slotNo,
          });

        let orderId: string;
        try {
          orderId = await submit(false);
        } catch (error) {
          const message = parseError(error);
          if (!isRiskConfirmRequired(message)) {
            throw error;
          }
          const ok = await confirm({
            title: i18n.t("actions.securityTitle"),
            message: i18n.t("actions.securityContinueOrder", { message }),
            confirmLabel: i18n.t("actions.continue"),
          });
          if (!ok) return;
          orderId = await submit(true);
        }

        await syncOrders();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const payAmount = Number(calc.payAmount || 0);
        void markOnboardingDone();
        void markOnboardingCoachDone();
        void markUserHasPurchased();
        if (onOrderCreated) {
          onOrderCreated({
            orderId,
            drawCount: payload.drawCount,
            payAmount,
            boxName: box.name,
            boxId: box.id,
            boxCategoryName: box.category?.name,
            boxCover: box.cover,
            pendingPayment: true,
          });
        } else {
          toast.success(i18n.t("actions.orderCreated", { orderId }));
        }
        trackEvent("order_created", {
          orderId,
          payAmount,
          drawCount: payload.drawCount,
          channel:
            peekPendingPaymentWallet() === "momo" && MOMO_ENABLED ? "momo" : resolvePaymentMode(),
        });
        if (MOCK_PAYMENT_ENABLED && onPaymentRequest) {
          trackEvent("payment_mock_requested", { orderId, payAmount });
          onPaymentRequest({ orderId, payAmount });
        } else {
          const channel =
            peekPendingPaymentWallet() === "momo" && MOMO_ENABLED && resolvePaymentMode() === "vnpay"
              ? "momo"
              : resolvePaymentMode();
          trackEvent(
            channel === "momo"
              ? ANALYTICS_EVENTS.PAYMENT_MOMO_REQUESTED
              : channel === "vnpay"
                ? "payment_vnpay_requested"
                : "payment_wechat_requested",
            {
              orderId,
              payAmount,
            },
          );
          await requestPayment(orderId, payAmount);
        }
      };

      if (queueIfOffline("offline.actionOrder", performSubmit, orderPersist)) return;
      await performSubmit();
    } catch (error) {
      const message = parseError(error);
      if (isPityStockExhaustedError(message) && payload.box?.id) {
        trackEvent("payment_fail", {
          message,
          reason: "pity_stock_exhausted",
          boxId: payload.box.id,
          stage: "create",
        });
        await promptPityCompensateForBox(payload.box.id);
        toast.error(i18n.t("boxDetails.pityCompensatePayBlocked"));
      } else {
        reportAppError(toAppError(error), "create_order");
        toast.error(message);
      }
    } finally {
      setCreatingOrder(false);
    }
  };

  const cancelUnpaidOrder = async (orderId: string) => {
    const perform = async () => {
      try {
        await cancelOrderMutation.mutateAsync(orderId);
        await syncOrders();
        toast.success(i18n.t("actions.orderCancelled"));
      } catch (error) {
        reportAppError(toAppError(error), "cancel_unpaid_order");
        toast.error(parseError(error));
      }
    };
    if (queueIfOffline("offline.actionCancelOrder", perform, { kind: "cancelOrder", token, payload: { orderId } })) return;
    await perform();
  };

  const openOrderDetails = async (orderId: string, options?: { silent?: boolean }): Promise<boolean> => {
    if (!options?.silent) {
      setPageLoading(true);
    }
    try {
      const order = await getOrderById(token, orderId);
      const normalizedProducts = normalizePrizeProducts(order);
      setSelectedOrder({
        ...order,
        items: order.items?.map((item, index) =>
          index === 0 ? { ...item, products: normalizedProducts } : item,
        ),
      });
      return true;
    } catch (error) {
      reportAppError(toAppError(error), "open_order_details");
      toast.error(parseError(error));
      return false;
    } finally {
      if (!options?.silent) {
        setPageLoading(false);
      }
    }
  };

  const payWithPrepay = async (orderId: string, prepay: PrepayResult) => {
    const paidNative = await invokeWechatPay(prepay);
    // Native invoke can fail-open after the user paid in WeChat; always poll briefly.
    if (!paidNative) {
      toast.info(i18n.t("teamLottery.waitingPayment", { defaultValue: "Confirming payment…" }));
    }
    const attempts = paidNative ? 12 : 20;
    for (let i = 0; i < attempts; i++) {
      try {
        const order = await getOrderById(token, orderId);
        if (!isUnpaidOrder(order)) {
          await syncOrders();
          if (onPaymentSuccess) {
            await onPaymentSuccess(orderId);
          } else {
            await clearRetentionOrderId();
            await openOrderDetails(orderId);
          }
          return true;
        }
      } catch {
        /* keep polling */
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  };

  const requestPayment = async (
    orderId: string,
    payAmount?: number,
    wallet = consumePendingPaymentWallet(),
    freshPrepay = false,
  ) => {
    if (isOffline()) {
      toast.info(i18n.t(resolvePaymentMode() === "vnpay" ? "actions.offlineVnpayPay" : "actions.offlineWechatPay"));
      return;
    }
    const amount = Number(payAmount ?? 0);
    // After retention claim, bypass cached full-amount prepay (~15m idempotency TTL).
    // Also auto-detect claim on retry / resume-unpaid so all paths use a fresh seed.
    const retainedOrderId = await getRetentionOrderId().catch(() => null);
    const useFresh = freshPrepay || retainedOrderId === orderId;
    const freshSeed = useFresh ? `${orderId}:retention` : undefined;
    trackEvent("payment_start", {
      orderId,
      payAmount: amount,
      mock: MOCK_PAYMENT_ENABLED,
      channel: resolvePaymentMode(),
      wallet,
      freshPrepay: useFresh,
    });
    armPaymentStaleWatch(orderId);
    if (MOCK_PAYMENT_ENABLED) {
      rememberPaymentChannel("mock");
      onPaymentRequest?.({ orderId, payAmount: amount });
      return;
    }
    if (wallet === "momo" && MOMO_ENABLED && resolvePaymentMode() === "vnpay") {
      try {
        const prepay = await getMoMoPrepayParams(
          token,
          orderId,
          freshSeed ? { idempotencySeed: `${freshSeed}:momo` } : undefined,
        );
        const serverAmount = Number((prepay as { payAmount?: number })?.payAmount ?? amount);
        rememberPaymentChannel("momo");
        trackEvent(ANALYTICS_EVENTS.PAYMENT_MOMO_REQUESTED, { orderId, payAmount: serverAmount });
        onMoMoPrepayReady?.({ orderId, payAmount: serverAmount, prepay });
      } catch (_error) {
        try {
          const prepay = await retryMoMoPrepayParams(
            token,
            orderId,
            freshSeed ? { idempotencySeed: `${freshSeed}:momo-retry` } : undefined,
          );
          const serverAmount = Number((prepay as { payAmount?: number })?.payAmount ?? amount);
          rememberPaymentChannel("momo");
          trackEvent(ANALYTICS_EVENTS.PAYMENT_MOMO_REQUESTED, { orderId, payAmount: serverAmount });
          onMoMoPrepayReady?.({ orderId, payAmount: serverAmount, prepay });
        } catch (retryError) {
          const message = parseError(retryError);
          trackEvent("payment_fail", { orderId, message, channel: "momo" });
          reportAppError(retryError instanceof Error ? retryError : new Error(message), "momo_prepay");
          if (isPityStockExhaustedError(message)) {
            await handlePityStockExhausted(orderId, message);
            return;
          }
          if (onPrepayFail) {
            onPrepayFail({ orderId, payAmount: amount, message, channel: "momo" });
          } else {
            toast.error(message);
          }
        }
      }
      return;
    }
    if (resolvePaymentMode() === "vnpay") {
      try {
        const prepay = await getVNPayPrepayParams(
          token,
          orderId,
          freshSeed ? { idempotencySeed: freshSeed } : undefined,
        );
        const serverAmount = Number(prepay?.payAmount ?? amount);
        rememberPaymentChannel("vnpay");
        onVnpayPrepayReady?.({ orderId, payAmount: serverAmount, prepay });
      } catch (_error) {
        try {
          const prepay = await retryVNPayPrepayParams(
            token,
            orderId,
            freshSeed ? { idempotencySeed: `${freshSeed}:retry` } : undefined,
          );
          const serverAmount = Number(prepay?.payAmount ?? amount);
          rememberPaymentChannel("vnpay");
          onVnpayPrepayReady?.({ orderId, payAmount: serverAmount, prepay });
        } catch (retryError) {
          const message = parseError(retryError);
          trackEvent("payment_fail", { orderId, message, channel: "vnpay" });
          reportAppError(retryError instanceof Error ? retryError : new Error(message), "vnpay_prepay");
          if (isPityStockExhaustedError(message)) {
            await handlePityStockExhausted(orderId, message);
            return;
          }
          if (onPrepayFail) {
            onPrepayFail({ orderId, payAmount: amount, message, channel: "vnpay" });
          } else {
            toast.error(message);
          }
        }
      }
      return;
    }
    const loadPrepay = () =>
      getWechatPrepayParams(token, orderId, freshSeed ? { idempotencySeed: freshSeed } : undefined);
    try {
      const prepay = await loadPrepay();
      rememberPaymentChannel("wechat");
      if (await payWithPrepay(orderId, prepay)) {
        clearPaymentStaleWatch(orderId);
        if (onPaymentSuccess) {
          await onPaymentSuccess(orderId);
        } else {
          trackEvent(ANALYTICS_EVENTS.PAYMENT_SUCCESS, { orderId, channel: "wechat" });
        }
        return;
      }
      onPrepayReady?.({ orderId, payAmount: amount, prepay });
    } catch (_error) {
      try {
        const prepay = await retryWechatPrepayParams(
          token,
          orderId,
          freshSeed ? { idempotencySeed: `${freshSeed}:retry` } : undefined,
        );
        rememberPaymentChannel("wechat");
        onPrepayReady?.({ orderId, payAmount: amount, prepay });
      } catch (retryError) {
        const message = parseError(retryError);
        trackEvent("payment_fail", { orderId, message, channel: "wechat" });
        reportAppError(retryError instanceof Error ? retryError : new Error(message), "wechat_prepay");
        if (isPityStockExhaustedError(message)) {
          await handlePityStockExhausted(orderId, message);
          return;
        }
        if (onPrepayFail) {
          onPrepayFail({ orderId, payAmount: amount, message, channel: "wechat" });
        } else {
          toast.error(message);
        }
      }
    }
  };

  const promptPityCompensateForBox = async (boxId: string) => {
    const pointsAllowed = !isIosDigitalGoodsRestricted();
    const choice = await new Promise<"WAIT" | "POINTS" | null>((resolve) => {
      const buttons = [
        {
          text: i18n.t("common.cancel"),
          style: "cancel" as const,
          onPress: () => resolve(null),
        },
        {
          text: i18n.t("boxDetails.pityCompensateWait"),
          onPress: () => resolve("WAIT"),
        },
      ];
      if (pointsAllowed) {
        buttons.push({
          text: i18n.t("boxDetails.pityCompensatePoints"),
          onPress: () => resolve("POINTS"),
        });
      }
      Alert.alert(
        i18n.t("boxDetails.pityCompensateTitle"),
        pointsAllowed
          ? i18n.t("boxDetails.pityCompensateBody")
          : i18n.t("boxDetails.pityCompensateBodyIos"),
        buttons,
        { cancelable: true, onDismiss: () => resolve(null) },
      );
    });
    if (!choice) return;
    await applyPityCompensateChoice(token, boxId, choice);
  };

  const handlePityStockExhausted = async (orderId: string, message: string) => {
    trackEvent("payment_fail", { orderId, message, reason: "pity_stock_exhausted" });
    try {
      const order = await getOrderById(token, orderId);
      const boxId = resolveOrderBoxId(order);
      if (boxId) {
        await promptPityCompensateForBox(boxId);
      }
    } catch (lookupError) {
      reportAppError(toAppError(lookupError), "pity_compensate_lookup");
    }
    throw new Error(i18n.t("boxDetails.pityCompensatePayBlocked"));
  };

  const executeMockPayment = async (orderId: string) => {
    const perform = async () => {
      rememberPaymentChannel("mock");
      const submit = async (riskConfirm?: boolean) => mockPayOrder(token, orderId, { riskConfirm });
      try {
        await submit(false);
      } catch (error) {
        const message = parseError(error);
        if (isPityStockExhaustedError(message)) {
          await handlePityStockExhausted(orderId, message);
        }
        if (!isRiskConfirmRequired(message)) {
          trackEvent("payment_fail", { orderId, message });
          reportAppError(error instanceof Error ? error : new Error(message), "mock_payment");
          throw error;
        }
        const ok = await confirm({
          title: i18n.t("actions.securityTitle"),
          message: i18n.t("actions.securityContinuePay", { message }),
          confirmLabel: i18n.t("actions.continue"),
        });
        if (!ok) {
          trackEvent("payment_cancel", { orderId, reason: "risk_confirm_declined" });
          throw new Error(i18n.t("actions.paymentCancelled"));
        }
        try {
          await submit(true);
        } catch (retryError) {
          const retryMessage = parseError(retryError);
          if (isPityStockExhaustedError(retryMessage)) {
            await handlePityStockExhausted(orderId, retryMessage);
          }
          throw retryError;
        }
      }
      await syncOrders();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearPaymentStaleWatch(orderId);
      // Success + retention_converted are emitted once in confirmPaymentSuccess (channel-aware).
      if (onPaymentSuccess) {
        await onPaymentSuccess(orderId);
      } else {
        await clearRetentionOrderId();
        trackEvent(ANALYTICS_EVENTS.PAYMENT_SUCCESS, { orderId, channel: "mock" });
        await openOrderDetails(orderId);
      }
    };
    if (queueIfOffline("offline.actionPay", perform, { kind: "mockPayment", token, payload: { orderId, riskConfirm: false } }))
      return;
    await perform();
  };

  const confirmReceive = async (orderId: string) => {
    const perform = async () => {
      try {
        await confirmReceiveMutation.mutateAsync(orderId);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        trackEvent("confirm_receive", { orderId });
        await syncOrders();
        const refreshed = await getOrderById(token, orderId);
        setSelectedOrder(refreshed);
        toast.success(i18n.t("actions.receiveConfirmed"));
      } catch (error) {
        reportAppError(toAppError(error), "confirm_receive");
        toast.error(parseError(error));
      }
    };
    if (queueIfOffline("offline.actionConfirmReceive", perform, { kind: "confirmReceive", token, payload: { orderId } })) return;
    await perform();
  };

  const redeemToBalance = async (orderId: string) => {
    if (isIosDigitalGoodsRestricted()) {
      toast.info(i18n.t("actions.iosRedeemBlocked"));
      return;
    }
    const perform = async () => {
      try {
        const amount = await redeemMutation.mutateAsync(orderId);
        await syncOrders();
        let latestBalance: number | void = undefined;
        if (onRedeemSuccess) {
          latestBalance = await onRedeemSuccess();
        }
        if (typeof latestBalance === "number") {
          toast.success(
            i18n.t("actions.redeemWithBalance", {
              amount: formatCurrency(Number(amount)),
              balance: formatCurrency(latestBalance),
            }),
          );
        } else {
          toast.success(i18n.t("actions.redeemToBalance", { amount: formatCurrency(amount) }));
        }
      } catch (error) {
        reportAppError(toAppError(error), "redeem_to_balance");
        toast.error(parseError(error));
      }
    };
    if (queueIfOffline("offline.actionRedeem", perform, { kind: "redeem", token, payload: { orderId } })) return;
    await perform();
  };

  return {
    openDetails,
    saveAddress,
    createOrder,
    cancelUnpaidOrder,
    openOrderDetails,
    requestPayment,
    payWithPrepay,
    executeMockPayment,
    redeemToBalance,
    confirmReceive,
  };
}
