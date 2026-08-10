import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuthToken } from "../hooks/useAuthToken";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { getOrderById } from "../services/orderService";
import { formatCurrency } from "../utils/formatCurrency";
import { formatOrderIdDisplay, isUnpaidOrder } from "../order-utils";
import type { Order } from "../types";

type Props = {
  orderId: string;
  responseCode?: string;
  onGoOrder: (orderId: string) => void;
  onGoHome: () => void;
  onRetryPay?: (orderId: string) => void;
  onPaymentSettled?: (orderId: string) => void | Promise<void>;
};

export function PaymentReturnView({
  orderId,
  responseCode,
  onGoOrder,
  onGoHome,
  onRetryPay,
  onPaymentSettled,
}: Props) {
  const { t } = useTranslation();
  const token = useAuthToken();
  const styles = useThemedStyles(buildPaymentReturnStyles);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || !orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getOrderById(token, orderId);
      setOrder(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("paymentReturn.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [orderId, t, token]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  const unpaid = order ? isUnpaidOrder(order) : true;
  const gatewayFailed = responseCode != null && responseCode !== "" && responseCode !== "00";
  const success = !!order && !unpaid && !gatewayFailed;

  useEffect(() => {
    if (!success || settledRef.current || !orderId || !onPaymentSettled) return;
    settledRef.current = true;
    void onPaymentSettled(orderId);
  }, [success, orderId, onPaymentSettled]);

  const failed = gatewayFailed || (!loading && order != null && unpaid);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t("paymentReturn.title")}</Text>
      <Text style={styles.meta}>{t("paymentReturn.orderId", { id: formatOrderIdDisplay(orderId) })}</Text>
      {loading && !order ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.hint}>{t("paymentReturn.confirming")}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? (
        <View style={styles.cardOk} accessibilityRole="alert">
          <Text style={styles.statusOk}>{t("paymentReturn.successTitle")}</Text>
          <Text style={styles.hint}>
            {t("paymentReturn.successAmount", {
              amount: formatCurrency(Number(order?.baseOrder?.payment?.payAmount ?? 0)),
            })}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => onGoOrder(orderId)} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>{t("paymentReturn.viewOrder")}</Text>
          </Pressable>
        </View>
      ) : null}
      {failed && !loading ? (
        <View style={styles.cardFail} accessibilityRole="alert">
          <Text style={styles.statusFail}>{t("paymentReturn.failTitle")}</Text>
          <Text style={styles.hint}>{t("paymentReturn.failHint")}</Text>
          {onRetryPay ? (
            <Pressable style={styles.primaryBtn} onPress={() => onRetryPay(orderId)} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>{t("paymentReturn.retryPay")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Pressable style={styles.secondaryBtn} onPress={onGoHome} accessibilityRole="button">
        <Text style={styles.secondaryBtnText}>{t("paymentReturn.backHome")}</Text>
      </Pressable>
    </View>
  );
}

function buildPaymentReturnStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, padding: spacing.xl, backgroundColor: colors.bgPage },
    title: { fontSize: typography.h3, fontWeight: "800", color: colors.textPrimary },
    meta: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.caption, marginBottom: spacing.lg },
    center: { alignItems: "center", paddingVertical: spacing.xl },
    hint: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.body, lineHeight: 22 },
    error: { color: colors.danger, marginBottom: spacing.md },
    cardOk: {
      backgroundColor: colors.successSoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.successSoftBorder,
      marginBottom: spacing.md,
    },
    cardFail: {
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      marginBottom: spacing.md,
    },
    statusOk: { fontSize: typography.h4, fontWeight: "800", color: colors.success },
    statusFail: { fontSize: typography.h4, fontWeight: "800", color: colors.danger },
    primaryBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    primaryBtnText: { color: colors.textOnBrand, fontWeight: "800" },
    secondaryBtn: { alignItems: "center", paddingVertical: spacing.md },
    secondaryBtnText: { color: colors.link, fontWeight: "700" },
  });
}
