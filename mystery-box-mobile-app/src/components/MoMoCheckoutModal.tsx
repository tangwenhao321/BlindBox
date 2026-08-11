import { AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PaymentAbandonPanel } from "./PaymentAbandonPanel";
import { usePaymentAbandonOffer } from "../hooks/usePaymentAbandonOffer";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { MoMoPrepayResult } from "../types";
import { formatCurrency } from "../utils/formatCurrency";
import { toast } from "../utils/toast";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";

type Props = {
  visible: boolean;
  orderId: string;
  payAmount: number;
  token?: string;
  prepay: MoMoPrepayResult | null;
  onClose: () => void;
  onRetry?: () => void;
  onRefreshStatus?: () => Promise<boolean>;
  onPaid?: () => void | Promise<void>;
  onClaimAndReprepay?: (payload: { orderId: string; payAmount: number }) => void | Promise<void>;
};

export function MoMoCheckoutModal({
  visible,
  orderId,
  payAmount,
  token,
  prepay,
  onClose,
  onRetry,
  onRefreshStatus,
  onPaid,
  onClaimAndReprepay,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildMoMoStyles);
  const pollingRef = useRef(false);
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
    channel: "momo",
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

  const openMoMo = async () => {
    const url = prepay?.deeplink;
    if (!url) {
      toast.error(t("momo.noPrepay"));
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      toast.error(t("momo.openFailed"));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <View style={styles.mask}>
        <View style={styles.card}>
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
              <Text style={styles.title}>{t("momo.title")}</Text>
              <Text style={styles.amount}>{formatCurrency(displayPayAmount)}</Text>
              <Text style={styles.meta}>{t("momo.orderId", { id: orderId })}</Text>
              <Text style={styles.hint}>{prepay?.stub ? t("momo.stubHint") : t("momo.continueHint")}</Text>
              <Pressable
                style={styles.btn}
                onPress={() => {
                  trackEvent(ANALYTICS_EVENTS.PAYMENT_MOMO_OPEN, { orderId });
                  void openMoMo();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.btnText}>{t("momo.continue")}</Text>
              </Pressable>
              {onRefreshStatus ? (
                <Pressable
                  onPress={() => void refreshPaymentStatus()}
                  accessibilityRole="button"
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryText}>{t("momo.checkStatus")}</Text>
                </Pressable>
              ) : null}
              {onRetry ? (
                <Pressable onPress={onRetry} accessibilityRole="button">
                  <Text style={styles.cancel}>{t("momo.retry")}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={requestClose} accessibilityRole="button">
                <Text style={styles.cancel}>{t("common.cancel")}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function buildMoMoStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.lg },
    card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg },
    title: { fontWeight: "900", fontSize: typography.h3, color: colors.textPrimary },
    amount: { marginTop: spacing.sm, fontSize: typography.h2, fontWeight: "900", color: colors.brand },
    meta: { marginTop: spacing.xs, color: colors.textSecondary },
    hint: { marginTop: spacing.md, color: colors.textMuted, lineHeight: 20 },
    btn: {
      marginTop: spacing.lg,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    btnText: { color: colors.textOnBrand, fontWeight: "800" },
    secondaryBtn: { marginTop: spacing.md, alignItems: "center" },
    secondaryText: { color: colors.brand, fontWeight: "700" },
    cancel: { textAlign: "center", marginTop: spacing.md, color: colors.textMuted },
  });
}
