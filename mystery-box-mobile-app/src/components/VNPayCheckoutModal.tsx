import { Linking, Modal, Pressable, StyleSheet, Text, View, Clipboard, AppState } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPaymentMode } from "../config/payment";
import { PaymentAbandonPanel } from "./PaymentAbandonPanel";
import { usePaymentAbandonOffer } from "../hooks/usePaymentAbandonOffer";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { VNPayPrepayResult } from "../types";
import { formatCurrency } from "../utils/formatCurrency";
import { openContactSupport } from "../utils/contactSupport";
import { toast } from "../utils/toast";

type Props = {
  visible: boolean;
  orderId: string;
  payAmount: number;
  token?: string;
  prepay: VNPayPrepayResult | null;
  onClose: () => void;
  onRetry?: () => void;
  onPaid?: () => void | Promise<void>;
  onRefreshStatus?: () => Promise<boolean>;
  onUseMockPay?: () => void;
  onClaimAndReprepay?: (payload: { orderId: string; payAmount: number }) => void | Promise<void>;
};

export function VNPayCheckoutModal({
  visible,
  orderId,
  payAmount,
  token,
  prepay,
  onClose,
  onRetry,
  onPaid,
  onRefreshStatus,
  onUseMockPay,
  onClaimAndReprepay,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildVNPayCheckoutStyles);
  const pollingRef = useRef(false);
  const showDevUrl = __DEV__ && getPaymentMode() === "vnpay";
  const [displayPayAmount, setDisplayPayAmount] = useState(payAmount);

  useEffect(() => {
    if (visible) setDisplayPayAmount(payAmount);
  }, [visible, payAmount]);

  const {
    abandonPhase,
    offerEligible,
    offerDiscount,
    claiming,
    requestClose,
    continuePay,
    leaveDirect,
    claimAndContinue,
  } = usePaymentAbandonOffer({
    visible,
    token,
    orderId,
    channel: "vnpay",
    onClose,
    onPayAmountChange: setDisplayPayAmount,
    onClaimAndReprepay,
  });

  const refreshPaymentStatus = useCallback(async () => {
    if (!onRefreshStatus || pollingRef.current) return;
    pollingRef.current = true;
    try {
      const paid = await onRefreshStatus();
      if (paid) {
        await onPaid?.();
      }
    } finally {
      pollingRef.current = false;
    }
  }, [onPaid, onRefreshStatus]);

  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshPaymentStatus();
      }
    });
    return () => sub.remove();
  }, [refreshPaymentStatus, visible]);

  const openVnpay = async () => {
    const url = prepay?.paymentUrl;
    if (!url) {
      toast.error(t("vnpay.noPrepay"));
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      toast.error(t("vnpay.openFailed"));
    }
  };

  const copyOrderId = async () => {
    Clipboard.setString(orderId);
    toast.success(t("vnpay.orderCopied"));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <Pressable
        style={styles.mask}
        onPress={requestClose}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {abandonPhase ? (
            <PaymentAbandonPanel
              onContinuePay={continuePay}
              onClaimAndContinue={() => {
                void claimAndContinue();
              }}
              onLeaveDirect={leaveDirect}
              offerEligible={offerEligible}
              offerDiscount={offerDiscount}
              claiming={claiming}
            />
          ) : (
            <>
              <Text style={styles.title}>{t("vnpay.title")}</Text>
              <Text style={styles.amount}>{formatCurrency(displayPayAmount)}</Text>
              <Text style={styles.meta}>{t("vnpay.orderId", { id: orderId })}</Text>
              <View style={styles.statusCard}>
                <Text style={styles.statusTitle}>
                  {prepay ? t("vnpay.statusReady") : t("vnpay.statusMissing")}
                </Text>
                <Text style={styles.tip}>{prepay ? t("vnpay.tip") : t("vnpay.noPrepay")}</Text>
                {prepay?.sandbox ? <Text style={styles.sandbox}>{t("vnpay.sandbox")}</Text> : null}
              </View>
              {showDevUrl && prepay?.paymentUrl ? (
                <Text style={styles.devUrl} numberOfLines={3}>
                  {prepay.paymentUrl}
                </Text>
              ) : null}
              {prepay ? (
                <Pressable
                  style={({ pressed }) => [styles.payBtn, pressed ? styles.pressed : null]}
                  onPress={() => void openVnpay()}
                  accessibilityRole="button"
                  accessibilityLabel={t("vnpay.open")}
                >
                  <Text style={styles.payBtnText}>{t("vnpay.open")}</Text>
                </Pressable>
              ) : null}
              {onRefreshStatus ? (
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
                  onPress={() => void refreshPaymentStatus()}
                  accessibilityRole="button"
                  accessibilityLabel={t("vnpay.refreshStatus")}
                >
                  <Text style={styles.secondaryBtnText}>{t("vnpay.refreshStatus")}</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
                onPress={() => void copyOrderId()}
                accessibilityRole="button"
                accessibilityLabel={t("vnpay.copyOrder")}
              >
                <Text style={styles.secondaryBtnText}>{t("vnpay.copyOrder")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.supportBtn, pressed ? styles.pressed : null]}
                onPress={() => void openContactSupport()}
                accessibilityRole="button"
                accessibilityLabel={t("vnpay.contactSupport")}
              >
                <Text style={styles.supportBtnText}>{t("vnpay.contactSupport")}</Text>
              </Pressable>
              {onRetry && !prepay ? (
                <Pressable
                  style={({ pressed }) => [styles.retryBtn, pressed ? styles.pressed : null]}
                  onPress={onRetry}
                  accessibilityRole="button"
                  accessibilityLabel={t("vnpay.retryPrepay")}
                >
                  <Text style={styles.retryBtnText}>{t("vnpay.retryPrepay")}</Text>
                </Pressable>
              ) : null}
              {onUseMockPay ? (
                <Pressable
                  style={({ pressed }) => [styles.mockBtn, pressed ? styles.pressed : null]}
                  onPress={onUseMockPay}
                  accessibilityRole="button"
                  accessibilityLabel={t("vnpay.mockPay")}
                >
                  <Text style={styles.mockBtnText}>{t("vnpay.mockPay")}</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.closeBtn} onPress={requestClose} accessibilityRole="button" accessibilityLabel={t("vnpay.close")}>
                <Text style={styles.closeText}>{t("vnpay.close")}</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildVNPayCheckoutStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    card: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.xl,
      maxHeight: "85%",
    },
    title: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
    amount: { marginTop: spacing.sm, fontSize: 32, fontWeight: "800", color: colors.brandText },
    meta: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.caption, marginBottom: spacing.md },
    statusCard: {
      backgroundColor: colors.bgSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusTitle: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.body },
    tip: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 },
    sandbox: { marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.micro },
    devUrl: { fontFamily: "monospace", fontSize: 10, color: colors.textMuted, marginBottom: spacing.md },
    payBtn: {
      backgroundColor: "#0066B3",
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    payBtnText: { color: "#fff", fontWeight: "800", fontSize: typography.bodyLg },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    secondaryBtnText: { color: colors.textPrimary, fontWeight: "700" },
    supportBtn: { alignItems: "center", paddingVertical: spacing.sm, marginBottom: spacing.sm },
    supportBtnText: { color: colors.link, fontWeight: "700" },
    retryBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    retryBtnText: { color: colors.textOnBrand, fontWeight: "800" },
    mockBtn: {
      backgroundColor: colors.mockWechatGreen,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    mockBtnText: { color: colors.textOnBrand, fontWeight: "800" },
    closeBtn: { alignItems: "center", paddingVertical: spacing.sm },
    closeText: { color: colors.link, fontWeight: "700" },
    pressed: { opacity: 0.9 },
  });
}
