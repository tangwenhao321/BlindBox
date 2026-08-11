import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchOrderPaymentMeta } from "../services/orderPaymentService";
import { PaymentAbandonPanel } from "./PaymentAbandonPanel";
import { usePaymentAbandonOffer } from "../hooks/usePaymentAbandonOffer";
import { usePayCountdown } from "../hooks/usePayCountdown";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { trackEvent } from "../utils/analytics";
import { formatCurrency } from "../utils/formatCurrency";

type Phase = "confirm" | "paying" | "success";

type Props = {
  visible: boolean;
  orderId: string;
  payAmount: number;
  token?: string;
  onClose: () => void;
  onConfirmPay: () => Promise<void>;
  onSimulateFail?: () => void;
  onClaimAndReprepay?: (payload: { orderId: string; payAmount: number }) => void | Promise<void>;
};

export function MockPaymentModal({
  visible,
  orderId,
  payAmount,
  token,
  onClose,
  onConfirmPay,
  onSimulateFail,
  onClaimAndReprepay,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildMockPaymentStyles);
  const [phase, setPhase] = useState<Phase>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [payDeadline, setPayDeadline] = useState<string | null>(null);
  const [displayPayAmount, setDisplayPayAmount] = useState(payAmount);
  const { label: countdownLabel, expired } = usePayCountdown(payDeadline);

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
    channel: "mock",
    onClose,
    onPayAmountChange: setDisplayPayAmount,
    onClaimAndReprepay,
    blockClose: phase === "paying",
  });

  useEffect(() => {
    if (!visible) {
      setPhase("confirm");
      setError(null);
      setPayDeadline(null);
      setDisplayPayAmount(payAmount);
      return;
    }
    setPhase("confirm");
    setError(null);
    setPayDeadline(null);
    setDisplayPayAmount(payAmount);
    if (!token || !orderId) return;
    void fetchOrderPaymentMeta(token, orderId).then((meta) => {
      if (meta?.payDeadline) setPayDeadline(meta.payDeadline);
    });
  }, [visible, token, orderId, payAmount]);

  const startPay = async () => {
    setError(null);
    setPhase("paying");
    try {
      await onConfirmPay();
      setPhase("success");
      setTimeout(() => onClose(), 900);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("payment.failFallback");
      setPhase("confirm");
      setError(message);
      trackEvent("payment_fail", { orderId, message, channel: "mock" });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      testID="mockPaymentModal"
      onRequestClose={phase === "paying" ? () => undefined : requestClose}
    >
      <Pressable style={styles.mask} onPress={phase === "paying" ? undefined : requestClose}>
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
              <View style={styles.wechatHeader}>
                <Text style={styles.wechatTitle}>{t("payment.wechatTitle")}</Text>
                <Text style={styles.wechatBadge}>{t("payment.mockBadge")}</Text>
              </View>
              <Text style={styles.merchant}>{t("payment.merchant")}</Text>
              <Text style={styles.amount}>{formatCurrency(displayPayAmount)}</Text>
              <Text style={styles.orderMeta}>{t("payment.orderMeta", { orderId })}</Text>
              {payDeadline && phase === "confirm" ? (
                <Text style={[styles.countdown, expired ? styles.countdownExpired : null]}>
                  {t("payment.countdown", { time: countdownLabel })}
                </Text>
              ) : null}

              {phase === "confirm" ? (
                <>
                  <Text style={styles.tip}>{t("payment.mockTip")}</Text>
                  {error ? (
                    <>
                      <Text style={styles.error}>{error}</Text>
                      <Pressable
                        style={styles.payBtn}
                        onPress={startPay}
                        accessibilityRole="button"
                        accessibilityLabel={t("payment.retryPay")}
                      >
                        <Text style={styles.payBtnText}>{t("payment.retryPay")}</Text>
                      </Pressable>
                    </>
                  ) : null}
                  {!error ? (
                    <Pressable
                      testID="mockPayConfirmButton"
                      accessibilityLabel={t("payment.confirmPay")}
                      style={({ pressed }) => [styles.payBtn, pressed ? styles.pressed : null]}
                      onPress={startPay}
                    >
                      <Text style={styles.payBtnText}>{t("payment.confirmPay")}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={requestClose}
                    testID="mockPayCancelButton"
                    accessibilityRole="button"
                    accessibilityLabel={t("payment.cancelPay")}
                  >
                    <Text style={styles.cancelText}>{t("payment.cancelPay")}</Text>
                  </Pressable>
                  {__DEV__ && onSimulateFail ? (
                    <Pressable
                      style={styles.failBtn}
                      onPress={onSimulateFail}
                      accessibilityRole="button"
                      accessibilityLabel={t("payment.simulateFail")}
                    >
                      <Text style={styles.failText}>{t("payment.simulateFail")}</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}

              {phase === "paying" ? (
                <View style={styles.centerBlock}>
                  <ActivityIndicator color={colors.brand} />
                  <Text style={styles.payingText}>{t("payment.paying")}</Text>
                </View>
              ) : null}

              {phase === "success" ? (
                <View style={styles.centerBlock}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successText}>{t("payment.success")}</Text>
                  <Text style={styles.tip}>{t("payment.successTip")}</Text>
                </View>
              ) : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildMockPaymentStyles(colors: ThemeColors) {
  return StyleSheet.create({
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  card: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 12,
  },
  wechatHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  wechatTitle: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
  wechatBadge: {
    fontSize: typography.caption,
    color: colors.successStrong,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successSoftBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    fontWeight: "700",
  },
  merchant: { color: colors.textSecondary, fontSize: typography.body },
  amount: { marginTop: spacing.sm, fontSize: 36, fontWeight: "800", color: colors.textPrimary },
  orderMeta: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.caption },
  countdown: { marginTop: spacing.xs, marginBottom: spacing.lg, color: colors.brand, fontWeight: "700" },
  countdownExpired: { color: colors.warning },
  tip: { color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18, marginBottom: spacing.md },
  error: { color: colors.warning, marginBottom: spacing.sm, fontWeight: "600" },
  payBtn: { backgroundColor: colors.mockWechatGreen, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: "center" },
  payBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.bodyLg },
  cancelBtn: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
  cancelText: { color: colors.textSecondary, fontWeight: "600" },
  failBtn: { marginTop: spacing.sm, alignItems: "center", paddingVertical: spacing.sm },
  failText: { color: colors.warning, fontWeight: "600", fontSize: typography.caption },
  centerBlock: { alignItems: "center", paddingVertical: spacing.xl },
  payingText: { marginTop: spacing.md, color: colors.textSecondary, fontWeight: "600" },
  successIcon: { fontSize: 42, color: colors.successStrong, fontWeight: "800" },
  successText: { marginTop: spacing.sm, fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
  pressed: { opacity: 0.9 },
  });
}
