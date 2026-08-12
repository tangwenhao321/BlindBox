import { AddressModal } from "./AddressModal";
import { MockPaymentModal } from "./MockPaymentModal";
import { NewcomerOfferModal } from "./NewcomerOfferModal";
import { OrderResultModal } from "./OrderResultModal";
import { SharePosterModal } from "./SharePosterModal";
import { WechatPrepayModal } from "./WechatPrepayModal";
import { VNPayCheckoutModal } from "./VNPayCheckoutModal";
import { MoMoCheckoutModal } from "./MoMoCheckoutModal";
import { PaymentErrorSheet } from "./PaymentErrorSheet";
import { ErrorBoundary } from "./ErrorBoundary";
import { MOCK_PAYMENT_ENABLED } from "../config/constants";
import { resolvePaymentMode } from "../config/payment";
import type { MysteryBox, PrepayResult, Product, VNPayPrepayResult, MoMoPrepayResult } from "../types";
import { toast } from "../utils/toast";
import { getRevealSpectatorShareToken } from "../utils/revealSpectatorTokenBridge";
import { useTranslation } from "react-i18next";

export type OrderResultState = {
  orderId: string;
  boxName: string;
  boxId?: string;
  boxCategoryName?: string;
  boxCover?: string;
  drawCount: number;
  payAmount: number;
  prizes: Product[];
  pendingPayment: boolean;
  /** Bumped after payment succeeds to force reveal playback. */
  revealPlaybackKey?: number;
} | null;

type Props = {
  token: string;
  newcomerVisible: boolean;
  onNewcomerClose: () => void;
  onNewcomerBuy: (box: MysteryBox) => void;
  paymentSession: { orderId: string; payAmount: number } | null;
  onClosePayment: () => void;
  onConfirmMockPay: () => Promise<void>;
  prepaySession: { orderId: string; payAmount: number; prepay: PrepayResult } | null;
  onClosePrepay: () => void;
  onRetryPrepay: () => void;
  onPayFromPrepay: () => void | Promise<void>;
  onMockPayFromPrepay: () => Promise<void>;
  vnpaySession: { orderId: string; payAmount: number; prepay: VNPayPrepayResult } | null;
  onCloseVnpay: () => void;
  onRetryVnpay: () => void;
  onRefreshVnpayStatus: () => Promise<boolean>;
  onVnpayPaid: () => void | Promise<void>;
  onMockPayFromVnpay?: () => Promise<void>;
  momoSession: { orderId: string; payAmount: number; prepay: MoMoPrepayResult } | null;
  onCloseMomo: () => void;
  onRetryMomo: () => void;
  onRefreshMomoStatus?: () => Promise<boolean>;
  onMomoPaid: () => void | Promise<void>;
  paymentErrorSession: { orderId: string; payAmount: number; message: string; channel: "wechat" | "vnpay" | "momo" } | null;
  onClosePaymentError: () => void;
  onRetryPaymentError: () => void;
  /** After retention claim: refresh amount and force a fresh prepay (drop stale gateway URL). */
  onRetentionReprepay?: (payload: { orderId: string; payAmount: number }) => void | Promise<void>;
  showAddressModal: boolean;
  editingAddressId: string | null;
  formRealName: string;
  formPhoneNumber: string;
  formRegion: string;
  formDistrict: string;
  formWard: string;
  formDetails: string;
  formHouseNumber: string;
  savingAddress: boolean;
  onChangeRealName: (v: string) => void;
  onChangePhoneNumber: (v: string) => void;
  onChangeRegion: (v: string) => void;
  onChangeDistrict: (v: string) => void;
  onChangeWard: (v: string) => void;
  onChangeDetails: (v: string) => void;
  onChangeHouseNumber: (v: string) => void;
  onCancelAddress: () => void;
  onSaveAddress: () => void;
  orderResult: OrderResultState;
  onCloseOrderResult: () => void;
  onViewOrdersFromResult: () => void;
  onPayFromResult: () => void;
  onTryAgainFromResult: () => void;
  onGoWarehouseFromResult?: () => void;
  onVerifyFairnessFromResult?: () => void;
  onShareFromResult: () => void;
  sharePosterVisible?: boolean;
  sharePosterOrderResult?: OrderResultState;
  onCloseSharePoster?: () => void;
};

export function AppModals(props: Props) {
  const {
    token,
    newcomerVisible,
    onNewcomerClose,
    onNewcomerBuy,
    paymentSession,
    onClosePayment,
    onConfirmMockPay,
    prepaySession,
    onClosePrepay,
    onRetryPrepay,
    onPayFromPrepay,
    onMockPayFromPrepay,
    vnpaySession,
    onCloseVnpay,
    onRetryVnpay,
    onRefreshVnpayStatus,
    onVnpayPaid,
    onMockPayFromVnpay,
    momoSession,
    onCloseMomo,
    onRetryMomo,
    onRefreshMomoStatus,
    onMomoPaid,
    paymentErrorSession,
    onClosePaymentError,
    onRetryPaymentError,
    onRetentionReprepay,
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
    onChangeRealName,
    onChangePhoneNumber,
    onChangeRegion,
    onChangeDistrict,
    onChangeWard,
    onChangeDetails,
    onChangeHouseNumber,
    onCancelAddress,
    onSaveAddress,
    orderResult,
    onCloseOrderResult,
    onViewOrdersFromResult,
    onPayFromResult,
    onTryAgainFromResult,
    onGoWarehouseFromResult,
    onVerifyFairnessFromResult,
    onShareFromResult,
    sharePosterVisible,
    sharePosterOrderResult,
    onCloseSharePoster,
  } = props;
  const { t } = useTranslation();

  return (
    <>
      <NewcomerOfferModal
        visible={newcomerVisible}
        token={token}
        onClose={onNewcomerClose}
        onBuyNow={onNewcomerBuy}
      />
      <AddressModal
        visible={showAddressModal}
        editing={!!editingAddressId}
        realName={formRealName}
        phoneNumber={formPhoneNumber}
        region={formRegion}
        district={formDistrict}
        ward={formWard}
        details={formDetails}
        houseNumber={formHouseNumber}
        saving={savingAddress}
        onChangeRealName={onChangeRealName}
        onChangePhoneNumber={onChangePhoneNumber}
        onChangeRegion={onChangeRegion}
        onChangeDistrict={onChangeDistrict}
        onChangeWard={onChangeWard}
        onChangeDetails={onChangeDetails}
        onChangeHouseNumber={onChangeHouseNumber}
        onCancel={onCancelAddress}
        onSave={onSaveAddress}
      />
      <SharePosterModal
        visible={!!sharePosterVisible && !!sharePosterOrderResult}
        boxName={sharePosterOrderResult?.boxName || ""}
        orderId={sharePosterOrderResult?.orderId || ""}
        drawCount={sharePosterOrderResult?.drawCount || 1}
        topPrizeName={
          sharePosterOrderResult?.prizes?.reduce<string | undefined>((best, p) => {
            const tier = (p.qualityType || "").toUpperCase();
            if (tier.includes("LEGEND")) return p.name;
            return best;
          }, sharePosterOrderResult?.prizes?.[0]?.name)
        }
        authToken={token}
        spectatorShareToken={
          sharePosterOrderResult?.orderId
            ? getRevealSpectatorShareToken(sharePosterOrderResult.orderId)
            : null
        }
        boxId={sharePosterOrderResult?.boxId}
        includeLatestFeed
        onClose={() => onCloseSharePoster?.()}
      />
      <ErrorBoundary>
        <OrderResultModal
          visible={
            !!orderResult &&
            !paymentSession &&
            !prepaySession &&
            !vnpaySession &&
            !momoSession &&
            !paymentErrorSession
          }
          orderId={orderResult?.orderId || ""}
          authToken={token}
          boxName={orderResult?.boxName || ""}
          boxId={orderResult?.boxId}
          boxCategoryName={orderResult?.boxCategoryName}
          boxCover={orderResult?.boxCover}
          drawCount={orderResult?.drawCount || 1}
          payAmount={orderResult?.payAmount || 0}
          prizes={orderResult?.prizes || []}
          onClose={onCloseOrderResult}
          onViewOrders={onViewOrdersFromResult}
          showPayButton={!!orderResult?.pendingPayment}
          pendingPayment={!!orderResult?.pendingPayment}
          revealPlaybackKey={orderResult?.revealPlaybackKey ?? 0}
          onPayNow={onPayFromResult}
          onTryAgain={onTryAgainFromResult}
          onGoWarehouse={onGoWarehouseFromResult}
          onVerifyFairness={onVerifyFairnessFromResult}
          onShare={onShareFromResult}
        />
      </ErrorBoundary>
      <ErrorBoundary>
        <MockPaymentModal
          visible={!!paymentSession}
          orderId={paymentSession?.orderId || ""}
          payAmount={paymentSession?.payAmount || 0}
          token={token}
          onClose={onClosePayment}
          onConfirmPay={async () => {
            await onConfirmMockPay();
          }}
          onSimulateFail={() => toast.error(t("payment.simulateFailToast"))}
          onClaimAndReprepay={onRetentionReprepay}
        />
      </ErrorBoundary>
      <WechatPrepayModal
        visible={!!prepaySession && resolvePaymentMode() === "wechat"}
        orderId={prepaySession?.orderId || ""}
        payAmount={prepaySession?.payAmount || 0}
        token={token}
        prepay={prepaySession?.prepay ?? null}
        onClose={onClosePrepay}
        onRetry={onRetryPrepay}
        onPay={onPayFromPrepay}
        onUseMockPay={
          MOCK_PAYMENT_ENABLED && __DEV__ ? () => void onMockPayFromPrepay() : undefined
        }
        onClaimAndReprepay={onRetentionReprepay}
      />
      <VNPayCheckoutModal
        visible={!!vnpaySession && resolvePaymentMode() === "vnpay"}
        orderId={vnpaySession?.orderId || ""}
        payAmount={vnpaySession?.payAmount || 0}
        token={token}
        prepay={vnpaySession?.prepay ?? null}
        onClose={onCloseVnpay}
        onRetry={onRetryVnpay}
        onRefreshStatus={onRefreshVnpayStatus}
        onPaid={onVnpayPaid}
        onUseMockPay={
          MOCK_PAYMENT_ENABLED && __DEV__ && onMockPayFromVnpay
            ? () => void onMockPayFromVnpay()
            : undefined
        }
        onClaimAndReprepay={onRetentionReprepay}
      />
      <MoMoCheckoutModal
        visible={!!momoSession && resolvePaymentMode() === "vnpay"}
        orderId={momoSession?.orderId || ""}
        payAmount={momoSession?.payAmount || 0}
        token={token}
        prepay={momoSession?.prepay ?? null}
        onClose={onCloseMomo}
        onRetry={onRetryMomo}
        onRefreshStatus={onRefreshMomoStatus}
        onPaid={onMomoPaid}
        onClaimAndReprepay={onRetentionReprepay}
      />
      <PaymentErrorSheet
        visible={!!paymentErrorSession}
        orderId={paymentErrorSession?.orderId || ""}
        payAmount={paymentErrorSession?.payAmount || 0}
        message={paymentErrorSession?.message || ""}
        channel={paymentErrorSession?.channel || "wechat"}
        onClose={onClosePaymentError}
        onRetry={onRetryPaymentError}
      />
    </>
  );
}
