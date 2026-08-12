import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { parseError } from "../api";
import { useAuthToken } from "../hooks/useAuthToken";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { getOrderById } from "../services/orderService";
import { fetchVipOrder, isVipOrderPaid, type VipOrder } from "../services/vipService";
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
  onRequireLogin?: () => void;
};

type LoadedOrder =
  | { kind: "box"; order: Order }
  | { kind: "vip"; order: VipOrder };

export function PaymentReturnView({
  orderId,
  responseCode,
  onGoOrder,
  onGoHome,
  onRetryPay,
  onPaymentSettled,
  onRequireLogin,
}: Props) {
  const { t } = useTranslation();
  const token = useAuthToken();
  const styles = useThemedStyles(buildPaymentReturnStyles);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState<LoadedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settledRef = useRef(false);
  const stopPollRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || !orderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      try {
        const next = await getOrderById(token, orderId);
        setLoaded({ kind: "box", order: next });
      } catch {
        const vip = await fetchVipOrder(token, orderId);
        setLoaded({ kind: "vip", order: vip });
      }
    } catch (e) {
      setError(parseError(e) || t("paymentReturn.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [orderId, t, token]);

  const [pollStartedAt] = useState(() => Date.now());
  const unpaid =
    loaded?.kind === "box"
      ? isUnpaidOrder(loaded.order)
      : loaded?.kind === "vip"
        ? !isVipOrderPaid(loaded.order)
        : true;
  // Gateway code is advisory only — async IPN / spoofable deep-link codes must not stop polling.
  const gatewayHintFailed = responseCode != null && responseCode !== "" && responseCode !== "00";
  const success = !!loaded && !unpaid;
  const confirming = unpaid && !error && Date.now() - pollStartedAt < 90_000;
  const failed = !loading && loaded != null && unpaid && !confirming;
  const payAmount =
    loaded?.kind === "box"
      ? Number(loaded.order.baseOrder?.payment?.payAmount ?? 0)
      : Number(loaded?.order.baseOrder?.payment?.payAmount ?? 0);

  useEffect(() => {
    if (success || failed) {
      stopPollRef.current = true;
    }
  }, [success, failed]);

  useEffect(() => {
    stopPollRef.current = false;
    if (!token) {
      setLoading(false);
      return;
    }
    void refresh();
    const timer = setInterval(() => {
      if (stopPollRef.current) return;
      void refresh();
    }, 2500);
    return () => clearInterval(timer);
  }, [refresh, token]);

  useEffect(() => {
    if (!success || settledRef.current || !orderId || !onPaymentSettled) return;
    settledRef.current = true;
    stopPollRef.current = true;
    void onPaymentSettled(orderId);
  }, [success, orderId, onPaymentSettled]);

  if (!token) {
    return (
      <View style={styles.root}>
        <Text style={styles.title}>{t("paymentReturn.title")}</Text>
        <Text style={styles.meta}>{t("paymentReturn.orderId", { id: formatOrderIdDisplay(orderId) })}</Text>
        <Text style={styles.hint}>{t("paymentReturn.loginRequired")}</Text>
        {onRequireLogin ? (
          <Pressable style={styles.primaryBtn} onPress={onRequireLogin} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>{t("paymentReturn.goLogin")}</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.secondaryBtn} onPress={onGoHome} accessibilityRole="button">
          <Text style={styles.secondaryBtnText}>{t("paymentReturn.backHome")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t("paymentReturn.title")}</Text>
      <Text style={styles.meta}>{t("paymentReturn.orderId", { id: formatOrderIdDisplay(orderId) })}</Text>
      {loading && !loaded ? (
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
              amount: formatCurrency(payAmount),
            })}
          </Text>
          {loaded?.kind === "box" ? (
            <Pressable style={styles.primaryBtn} onPress={() => onGoOrder(orderId)} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>{t("paymentReturn.viewOrder")}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryBtn} onPress={onGoHome} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>{t("paymentReturn.backHome")}</Text>
            </Pressable>
          )}
        </View>
      ) : null}
      {confirming && !success && !failed ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.hint}>{t("paymentReturn.confirming")}</Text>
          {gatewayHintFailed ? (
            <Text style={styles.hint}>{t("paymentReturn.gatewayPendingHint", {
              defaultValue: "Wallet returned a non-success code — still confirming with the server…",
            })}</Text>
          ) : null}
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
