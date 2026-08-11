import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { claimAbandonOffer, fetchOrderPaymentMeta } from "../services/orderPaymentService";
import { setRetentionOrderId } from "../utils/retentionStorage";
import { localizeRetentionMessage } from "../utils/localizeRetentionMessage";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import { toast } from "../utils/toast";

type Options = {
  visible: boolean;
  token?: string;
  orderId: string;
  channel: string;
  onClose: () => void;
  /** Refresh displayed amount after claim (same session). */
  onPayAmountChange?: (payAmount: number) => void;
  /** Clear stale prepay and re-open checkout with discounted amount. */
  onClaimAndReprepay?: (payload: { orderId: string; payAmount: number }) => void | Promise<void>;
  blockClose?: boolean;
};

/**
 * Shared abandon → claim flow. Retention is original-order only and rate-limited server-side.
 */
export function usePaymentAbandonOffer({
  visible,
  token,
  orderId,
  channel,
  onClose,
  onPayAmountChange,
  onClaimAndReprepay,
  blockClose = false,
}: Options) {
  const { t } = useTranslation();
  const [abandonPhase, setAbandonPhase] = useState(false);
  const [offerEligible, setOfferEligible] = useState(true);
  const [offerDiscount, setOfferDiscount] = useState(0);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!visible) {
      setAbandonPhase(false);
      setOfferEligible(true);
      setOfferDiscount(0);
      setClaiming(false);
      return;
    }
    if (!token || !orderId) return;
    void fetchOrderPaymentMeta(token, orderId).then((meta) => {
      if (!meta) return;
      setOfferEligible(meta.retentionEligible !== false && !meta.retentionClaimed);
      setOfferDiscount(Number(meta.retentionDiscountAmount ?? 0));
      if (typeof meta.payAmount === "number" && Number.isFinite(meta.payAmount)) {
        onPayAmountChange?.(meta.payAmount);
      }
    });
  }, [visible, token, orderId, onPayAmountChange]);

  const showAbandon = useCallback(() => {
    setAbandonPhase(true);
    trackEvent(ANALYTICS_EVENTS.RETENTION_OFFER_SHOWN, {
      orderId,
      channel,
      eligible: offerEligible,
    });
  }, [channel, offerEligible, orderId]);

  const leaveDirect = useCallback(() => {
    trackEvent(ANALYTICS_EVENTS.PAYMENT_CANCEL, { orderId, channel });
    trackEvent(ANALYTICS_EVENTS.RETENTION_OFFER_DISMISSED, { orderId, channel });
    onClose();
  }, [channel, onClose, orderId]);

  const requestClose = useCallback(() => {
    if (blockClose || claiming) return;
    if (abandonPhase) {
      leaveDirect();
      return;
    }
    if (token && orderId) {
      showAbandon();
      return;
    }
    leaveDirect();
  }, [abandonPhase, blockClose, claiming, leaveDirect, orderId, showAbandon, token]);

  const continuePay = useCallback(() => {
    trackEvent(ANALYTICS_EVENTS.RETENTION_OFFER_CONTINUE, { orderId, channel });
    setAbandonPhase(false);
  }, [channel, orderId]);

  const claimAndContinue = useCallback(async () => {
    if (!token || !orderId || claiming) return;
    setClaiming(true);
    try {
      const res = await claimAbandonOffer(token, orderId);
      const localized = localizeRetentionMessage(t, res.message, res.discountAmount);
      if (res.granted) {
        await setRetentionOrderId(orderId);
        const nextPay =
          typeof res.payAmount === "number" && Number.isFinite(res.payAmount)
            ? res.payAmount
            : undefined;
        trackEvent(ANALYTICS_EVENTS.RETENTION_OFFER_CLAIMED, {
          orderId,
          channel,
          discountAmount: res.discountAmount,
          payAmount: nextPay,
        });
        toast.success(t("payment.retentionToast", { message: localized }));
        toast.info(t("payment.retentionAutoApplyHint"));
        if (nextPay !== undefined) {
          onPayAmountChange?.(nextPay);
        }
        setOfferEligible(false);
        setAbandonPhase(false);
        if (onClaimAndReprepay && nextPay !== undefined) {
          await onClaimAndReprepay({ orderId, payAmount: nextPay });
        }
        return;
      }
      if (res.message) {
        toast.info(localized);
      }
      setOfferEligible(false);
      if (typeof res.payAmount === "number" && Number.isFinite(res.payAmount)) {
        onPayAmountChange?.(res.payAmount);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t("payment.failFallback");
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  }, [channel, claiming, onClaimAndReprepay, onPayAmountChange, orderId, t, token]);

  return {
    abandonPhase,
    offerEligible,
    offerDiscount,
    claiming,
    requestClose,
    continuePay,
    leaveDirect,
    claimAndContinue,
  };
}
