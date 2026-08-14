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

const POLL_BASE_MS = 2000;
const POLL_MAX_MS = 10_000;
const POLL_DEADLINE_MS = 90_000;

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
  const [pollAttempt, setPollAttempt] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const settledRef = useRef(false);
  const stopPollRef = useRef(false);
  const [pollStartedAt] = useState(() => Date.now());

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

  const unpaid =
    loaded?.kind === "box"
      ? isUnpaidOrder(loaded.order)
      : loaded?.kind === "vip"
        ? !isVipOrderPaid(loaded.order)
        : true;
  // Gateway code is advisory only — async IPN / spoofable deep-link codes must not stop polling.
  const gatewayHintFailed = responseCode != null && responseCode !== "" && responseCode !== "00";
  const success = !!loaded && !unpaid;
  const elapsedMs = nowTick - pollStartedAt;
  const withinDeadline = elapsedMs < POLL_DEADLINE_MS;
  const confirming = unpaid && !error && withinDeadline;
  const failed = !loading && loaded != null && unpaid && !confirming;
  const payAmount =
    loaded?.kind === "box"
      ? Number(loaded.order.baseOrder?.payment?.payAmount ?? 0)
      : Number(loaded?.order.baseOrder?.payment?.payAmount ?? 0);
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));

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
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const scheduleNext = () => {
      if (cancelled || stopPollRef.current) return;
      if (Date.now() - pollStartedAt >= POLL_DEADLINE_MS) {
        setNowTick(Date.now());
        return;
      }
      const delay = attempt === 0 ? 0 : Math.min(POLL_MAX_MS, Math.round(POLL_BASE_MS * Math.pow(1.55, attempt - 1)));
      timeoutId = setTimeout(() => {
        void (async () => {
          if (cancelled || stopPollRef.current) return;
          attempt += 1;
          setPollAttempt(attempt);
          setNowTick(Date.now());
          await refresh();
          if (!cancelled && !stopPollRef.current) {
            scheduleNext();
          }
        })();
      }, delay);
    };

    scheduleNext();
    const tick = setInterval(() => setNowTick(Date.now()), 1000);
    return () => {
      cancelled = true;
      stopPollRef.current = true;
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(tick);
    };
  }, [refresh, token, pollStartedAt]);

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
        <View style={styles.cardNeutral} accessibilityRole="summary">
          <Text style={styles.statusNeutral}>{t("paymentReturn.loginRequired")}</Text>
        </View>
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

      {error ? (
        <View style={styles.cardFail} accessibilityRole="alert">
          <Text style={styles.statusFail}>{t("paymentReturn.loadFailed")}</Text>
          <Text style={styles.hint}>{error}</Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel={t("paymentReturn.retryCheck")}
          >
            <Text style={styles.primaryBtnText}>{t("paymentReturn.retryCheck")}</Text>
          </Pressable>
        </View>
      ) : null}

      {success ? (
        <View style={styles.cardOk} accessibilityRole="alert">
          <Text style={styles.statusOk}>{t("paymentReturn.successTitle")}</Text>
          <Text style={styles.hint}>
            {t("paymentReturn.successAmount", {
              amount: formatCurrency(payAmount),
            })}
          </Text>
          <Text style={styles.hint}>{t("paymentReturn.successHint")}</Text>
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
        <View style={styles.cardNeutral} accessibilityRole="progressbar">
          <ActivityIndicator size="large" />
          <Text style={styles.statusNeutral}>{t("paymentReturn.waitingTitle")}</Text>
          <Text style={styles.hint}>{t("paymentReturn.waitingHint")}</Text>
          <Text style={styles.metaLine}>
            {t("paymentReturn.waitingProgress", { seconds: elapsedSec, attempt: Math.max(pollAttempt, 1) })}
          </Text>
          {gatewayHintFailed ? (
            <Text style={styles.hint}>{t("paymentReturn.gatewayPendingHint")}</Text>
          ) : null}
        </View>
      ) : null}

      {failed && !loading ? (
        <View style={styles.cardFail} accessibilityRole="alert">
          <Text style={styles.statusFail}>{t("paymentReturn.failTitle")}</Text>
          <Text style={styles.hint}>{t("paymentReturn.failHint")}</Text>
          <Text style={styles.metaLine}>{t("paymentReturn.failTimedOut")}</Text>
          {onRetryPay ? (
            <Pressable style={styles.primaryBtn} onPress={() => onRetryPay(orderId)} accessibilityRole="button">
              <Text style={styles.primaryBtnText}>{t("paymentReturn.retryPay")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.secondaryOutlineBtn}
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel={t("paymentReturn.retryCheck")}
          >
            <Text style={styles.secondaryOutlineText}>{t("paymentReturn.retryCheck")}</Text>
          </Pressable>
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
    metaLine: { marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.micro },
    hint: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: typography.body, lineHeight: 22 },
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
    cardNeutral: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: spacing.md,
      alignItems: "center",
    },
    statusOk: { fontSize: typography.h4, fontWeight: "800", color: colors.success },
    statusFail: { fontSize: typography.h4, fontWeight: "800", color: colors.danger },
    statusNeutral: {
      marginTop: spacing.md,
      fontSize: typography.h4,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    primaryBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      alignSelf: "stretch",
    },
    primaryBtnText: { color: colors.textOnBrand, fontWeight: "800" },
    secondaryOutlineBtn: {
      marginTop: spacing.sm,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignSelf: "stretch",
    },
    secondaryOutlineText: { color: colors.textPrimary, fontWeight: "700" },
    secondaryBtn: { alignItems: "center", paddingVertical: spacing.md },
    secondaryBtnText: { color: colors.link, fontWeight: "700" },
  });
}
