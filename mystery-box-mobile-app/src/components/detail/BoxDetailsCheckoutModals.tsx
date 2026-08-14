import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmOrderModal } from "../ConfirmOrderModal";
import { AddressRequiredBanner } from "../ui/AddressRequiredBanner";
import { estimatePayDeadlineFromNow } from "../../utils/payDeadlineEstimate";
import { DrawPackModal, type DrawPackOption } from "../DrawPackModal";
import { AgeGateModal, useAgeGate } from "../AgeGateModal";
import { trackEvent } from "../../utils/analytics";
import { setPendingPaymentWallet } from "../../payment/paymentWalletPreference";
import { fetchSpendLimit, type SpendLimitView } from "../../services/complianceService";
import { fetchBoxProbability, resolveDisplayRates, type BoxProbability } from "../../services/probabilityService";
import { formatCurrency, formatCurrencyOptional } from "../../utils/formatCurrency";
import type { Address, MysteryBox } from "../../types";
import type { QueueStatus } from "../../services/drawQueueService";
import type { PityProgress } from "../../services/pityService";

import type { DrawMode } from "../../services/orderService";

type Props = {
  activeBox: MysteryBox;
  authToken: string;
  drawCount: number;
  drawMode: DrawMode;
  selectedSlotNo?: number | null;
  drawOptions: DrawPackOption[];
  displayPayAmount: number;
  quotedProduct: number;
  batchDiscount: number;
  quoteDeliveryFee: number;
  quoteCouponAmount: number;
  quoteRetentionDiscount: number;
  quoteSavingsAmount?: number;
  suggestedCouponApplied?: boolean;
  suggestedCouponUserId?: string;
  availableCoupons?: import("../../types").CouponItem[];
  selectedCouponUserId?: string;
  onSelectCoupon?: (couponUserId: string) => void;
  quotingPrice?: boolean;
  quoteError?: string | null;
  onRetryQuote?: () => void;
  creatingOrder: boolean;
  canSubmit: boolean;
  priceHint: string;
  hasAddress: boolean;
  addresses: Address[];
  selectedAddressId: string;
  isLoggedIn: boolean;
  queueBlocked: boolean;
  buyoutBlocked: boolean;
  queueStatus: QueueStatus | null;
  offline?: boolean;
  poolTotal?: number;
  poolRemaining?: number;
  wholeBoxDrawCount?: number;
  pityProgress?: PityProgress | null;
  onChangeDrawCount: (count: number) => void;
  onCreateOrder: (drawMode: DrawMode, slotNo?: number) => void;
  onRequireLogin?: () => void;
  onOpenAddressModal: () => void;
  onOpenAddressFormPage?: (address?: import("../../types").Address, resumeCheckout?: boolean) => void;
  drawModalVisible: boolean;
  onDrawModalVisibleChange: (visible: boolean) => void;
  confirmVisible: boolean;
  onConfirmVisibleChange: (visible: boolean) => void;
  spendLimitRefreshKey?: number;
};

export function BoxDetailsCheckoutModals(props: Props) {
  const {
    activeBox,
    authToken,
    drawCount,
    drawMode,
    selectedSlotNo,
    drawOptions,
    displayPayAmount,
    quotedProduct,
    batchDiscount,
    quoteDeliveryFee: _quoteDeliveryFee,
    quoteCouponAmount,
    quoteRetentionDiscount,
    quoteSavingsAmount = 0,
    suggestedCouponApplied = false,
    suggestedCouponUserId,
    availableCoupons = [],
    selectedCouponUserId = "",
    onSelectCoupon,
    quotingPrice,
    quoteError,
    onRetryQuote,
    creatingOrder,
    canSubmit,
    priceHint,
    hasAddress,
    addresses: _addresses,
    selectedAddressId: _selectedAddressId,
    isLoggedIn,
    queueBlocked,
    buyoutBlocked,
    queueStatus,
    offline = false,
    poolTotal,
    poolRemaining,
    wholeBoxDrawCount,
    pityProgress: _pityProgress = null,
    onChangeDrawCount,
    onCreateOrder,
    onRequireLogin,
    onOpenAddressModal,
    onOpenAddressFormPage,
    drawModalVisible,
    onDrawModalVisibleChange,
    confirmVisible,
    onConfirmVisibleChange,
    spendLimitRefreshKey = 0,
  } = props;

  const { t } = useTranslation();
  const [agreedPay, setAgreedPay] = useState(false);
  const [addressHintVisible, setAddressHintVisible] = useState(false);
  const ageGate = useAgeGate(authToken);
  const [ageGateVisible, setAgeGateVisible] = useState(false);
  const [pendingAgeWallet, setPendingAgeWallet] = useState<"default" | "momo">("default");
  const [spendLimit, setSpendLimit] = useState<SpendLimitView | null>(null);
  const [spendLimitLoadFailed, setSpendLimitLoadFailed] = useState(false);
  const [probability, setProbability] = useState<BoxProbability | null>(null);
  const estimatedPayDeadline = estimatePayDeadlineFromNow();

  useEffect(() => {
    if (!confirmVisible || !authToken) {
      setSpendLimit(null);
      setSpendLimitLoadFailed(false);
      return;
    }
    setSpendLimitLoadFailed(false);
    void fetchSpendLimit(authToken)
      .then((view) => {
        setSpendLimit(view);
        setSpendLimitLoadFailed(false);
      })
      .catch(() => {
        setSpendLimit(null);
        setSpendLimitLoadFailed(true);
      });
  }, [confirmVisible, authToken, spendLimitRefreshKey]);

  useEffect(() => {
    if (!confirmVisible && !drawModalVisible) {
      return;
    }
    setProbability(null);
    void fetchBoxProbability(activeBox.id, {
      token: authToken || undefined,
      drawCount,
    }).then(setProbability);
  }, [confirmVisible, drawModalVisible, activeBox.id, authToken, drawCount]);

  useEffect(() => {
    if (confirmVisible) {
      setAgreedPay(false);
    }
  }, [confirmVisible, activeBox.id, drawCount]);

  const spendLimitMeta = useMemo(() => {
    if (spendLimitLoadFailed) {
      return { warning: t("checkout.spendLimitLoadFailed", { defaultValue: "Could not verify spend limits — try again" }), blocked: true };
    }
    if (!spendLimit?.enabled) {
      return { warning: null as string | null, blocked: false };
    }
    if (!spendLimit.withinLimits || spendLimit.purchaseAllowed === false) {
      return { warning: t("checkout.spendLimitBlocked"), blocked: true };
    }
    const dailyRemaining = spendLimit.dailyRemaining;
    if (dailyRemaining != null && displayPayAmount > dailyRemaining + 0.009) {
      return {
        warning: t("checkout.spendLimitDailyWarning", {
          amount: formatCurrency(displayPayAmount),
          remaining: formatCurrencyOptional(dailyRemaining),
        }),
        blocked: true,
      };
    }
    return { warning: null, blocked: false };
  }, [spendLimit, spendLimitLoadFailed, displayPayAmount, t]);

  const submitOrder = () => {
    trackEvent("start_checkout", { boxId: activeBox.id, drawCount });
    onConfirmVisibleChange(false);
    onCreateOrder(drawMode, drawMode === "cabinet" ? selectedSlotNo ?? undefined : undefined);
  };

  const goFillAddress = () => {
    setAddressHintVisible(false);
    onConfirmVisibleChange(false);
    if (onOpenAddressFormPage) {
      onOpenAddressFormPage(undefined, true);
    } else {
      onOpenAddressModal();
    }
  };

  return (
    <>
      <AddressRequiredBanner
        visible={addressHintVisible}
        onAdd={goFillAddress}
        onDismiss={() => setAddressHintVisible(false)}
      />
      <DrawPackModal
        visible={drawModalVisible}
        boxName={activeBox.name}
        unitPrice={activeBox.price}
        options={drawOptions}
        selectedCount={drawCount}
        onSelectCount={(count) => {
          trackEvent("box_draw_count_change", { boxId: activeBox.id, drawCount: count });
          onChangeDrawCount(count);
        }}
        onClose={() => onDrawModalVisibleChange(false)}
        onConfirm={() => {
          onDrawModalVisibleChange(false);
          onConfirmVisibleChange(true);
        }}
        confirming={false}
        canSubmit={hasAddress}
        priceHint={priceHint}
        hasAddress={hasAddress}
        requireAddress
        onAddAddress={() => {
          onDrawModalVisibleChange(false);
          if (onOpenAddressFormPage) {
            onOpenAddressFormPage(undefined, true);
          } else {
            onOpenAddressModal();
          }
        }}
        poolTotal={poolTotal}
        poolRemaining={poolRemaining}
        wholeBoxDrawCount={wholeBoxDrawCount}
      />

      <ConfirmOrderModal
        visible={confirmVisible}
        box={activeBox}
        drawCount={drawCount}
        unitPrice={activeBox.price}
        productAmount={quotedProduct}
        batchDiscount={batchDiscount}
        deliveryFee={0}
        hideShippingDetails={false}
        couponAmount={Math.max(0, quoteCouponAmount - quoteRetentionDiscount)}
        retentionDiscountAmount={quoteRetentionDiscount}
        payAmount={displayPayAmount}
        quoting={quotingPrice}
        quoteError={quoteError}
        onRetryQuote={onRetryQuote}
        paying={creatingOrder}
        payBlocked={!canSubmit || !hasAddress}
        payBlockedHint={
          !hasAddress
            ? t("drawPack.addressRequired")
            : offline
              ? t("offline.noNetworkPay")
              : queueBlocked
                ? t("boxDetails.checkoutQueueBlocked", { position: queueStatus?.position ?? "?" })
                : buyoutBlocked
                  ? t("boxDetails.buyoutLockLostRetry")
                  : drawMode === "cabinet"
                    ? t("boxDetails.cabinetCheckoutBlocked")
                    : undefined
        }
        suggestedCouponSavings={quoteSavingsAmount}
        suggestedCouponApplied={suggestedCouponApplied}
        suggestedCouponUserId={suggestedCouponUserId}
        availableCoupons={availableCoupons}
        selectedCouponUserId={selectedCouponUserId}
        onSelectCoupon={onSelectCoupon}
        spendLimitWarning={spendLimitMeta.warning}
        spendLimitBlocked={spendLimitMeta.blocked}
        payDeadlineIso={estimatedPayDeadline}
        hasAddress={hasAddress}
        addressSummary={null}
        onEditAddress={undefined}
        onRequestAddress={goFillAddress}
        agreed={agreedPay}
        onToggleAgreed={() => setAgreedPay((v) => !v)}
        onClose={() => onConfirmVisibleChange(false)}
        deferPayLabel={queueStatus?.canDraw ? t("boxDetails.deferPayLater") : undefined}
        onDeferPay={queueStatus?.canDraw ? () => onConfirmVisibleChange(false) : undefined}
        probabilityRates={(() => {
          const display = resolveDisplayRates(probability);
          if (!display) return null;
          return {
            legendaryRate: display.legendaryRate,
            hiddenRate: display.hiddenRate,
            generalRate: display.generalRate,
            dynamicProbability: probability?.dynamicProbability !== false,
            adjusted: display.adjusted,
          };
        })()}
        onPay={(wallet) => {
          trackEvent("confirm_pay_click", { boxId: activeBox.id, drawCount });
          if (!isLoggedIn) {
            onRequireLogin?.();
            return;
          }
          if (!hasAddress) {
            setAddressHintVisible(true);
            return;
          }
          setAddressHintVisible(false);
          if (!canSubmit) return;
          if (ageGate.needsGate) {
            setPendingAgeWallet(wallet ?? "default");
            setAgeGateVisible(true);
            return;
          }
          setPendingPaymentWallet(wallet ?? "default");
          submitOrder();
        }}
      />

      <AgeGateModal
        visible={ageGateVisible}
        authToken={authToken}
        onConfirmed={() => {
          ageGate.setConfirmed(true);
          setAgeGateVisible(false);
          setPendingPaymentWallet(pendingAgeWallet);
          trackEvent("box_create_order_click", { boxId: activeBox.id, drawCount });
          submitOrder();
        }}
        onDecline={() => setAgeGateVisible(false)}
      />
    </>
  );
}
