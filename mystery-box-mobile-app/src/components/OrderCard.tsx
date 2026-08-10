import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getOrderBoxName, getOrderStatusLabel, getOrderStatusTheme, getOrderTimeLabel, formatOrderIdDisplay } from "../order-utils";
import { ORDER_STATUS } from "../config/constants";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { PrimaryButton } from "./ui/PrimaryButton";
import { PayCountdownText } from "./ui/PayCountdownText";
import { RemoteImage } from "./ui/RemoteImage";
import { useScreenStyles } from "../styles/screenStyles";
import { radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { resolveBoxImageUrl, resolveProductImageUrl } from "../utils/boxImage";
import { formatCurrencyOptional } from "../utils/formatCurrency";
import type { Order } from "../types";

type Props = {
  order: Order;
  authToken?: string;
  canCancel: boolean;
  displayTitle?: string;
  displayProduct?: import("../types").Product;
  shipPending?: boolean;
  onOpenDetails: (id: string) => void;
  onPay: (id: string) => void;
  onCancel: (id: string) => void;
};

function OrderCardInner(props: Props) {
  const { order, authToken, canCancel, displayTitle, displayProduct, shipPending, onOpenDetails, onPay, onCancel } = props;
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildOrderCardStyles);
  const screenStyles = useScreenStyles();
  const theme = getOrderStatusTheme(order.status, themeColors);
  const isUnpaid = order.status === ORDER_STATUS.TO_BE_PAID;
  const payAmount = order.baseOrder?.payment?.payAmount;
  const boxName = displayTitle ?? getOrderBoxName(order);
  const timeLabel = getOrderTimeLabel(order);
  const statusLabel = shipPending ? t("warehouse.shipStatusPending") : getOrderStatusLabel(order.status);
  const line = order.items?.[0];
  const product = displayProduct ?? line?.products?.[0];
  const thumbUri = product?.id
    ? resolveProductImageUrl(product.id, product.name || boxName, product.cover)
    : resolveBoxImageUrl({
        id: line?.mysteryBox?.id || order.id,
        name: boxName,
        cover: line?.mysteryBox?.cover,
      });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed ? screenStyles.pressed : null]}
      onPress={() => onOpenDetails(order.id)}
      accessibilityRole="button"
      accessibilityLabel={t("orders.cardA11y", { name: boxName, status: statusLabel })}
    >
      <View style={styles.topRow}>
        <RemoteImage uri={thumbUri} style={styles.thumb} />
        <View style={styles.titleCol}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {boxName}
          </Text>
          <Text style={styles.orderId}>#{formatOrderIdDisplay(order.id)}</Text>
        </View>
        <Text style={[styles.statusTag, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}>
          {statusLabel}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{timeLabel}</Text>
        <Text style={styles.amount}>{formatCurrencyOptional(typeof payAmount === "number" ? payAmount : null)}</Text>
      </View>
      <Text style={styles.meta}>
        {displayTitle
          ? t("orders.prizeLine")
          : t("orders.qty", { count: order.items?.[0]?.mysteryBoxCount ?? "-" })}
      </Text>
      {order.baseOrder?.trackingNumber ? (
        <Text style={styles.tracking}>{t("orders.tracking", { number: order.baseOrder.trackingNumber })}</Text>
      ) : null}
      {isUnpaid ? (
        authToken ? (
          <PayCountdownText
            authToken={authToken}
            orderId={order.id}
            prefix={t("orders.payCountdownPrefix")}
            style={styles.payHint}
          />
        ) : (
          <Text style={styles.payHint}>{t("orders.paySoon")}</Text>
        )
      ) : null}

      <View style={styles.actions}>
        {isUnpaid ? (
          <PrimaryButton label={t("orders.payNow")} variant="accent" onPress={() => onPay(order.id)} style={styles.actionBtn} />
        ) : null}
        <PrimaryButton label={t("orders.details")} variant="secondary" onPress={() => onOpenDetails(order.id)} style={styles.actionBtn} />
        {canCancel ? (
          <PrimaryButton label={t("orders.cancel")} variant="ghost" onPress={() => onCancel(order.id)} style={styles.actionBtn} />
        ) : null}
      </View>
    </Pressable>
  );
}

function buildOrderCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
      marginHorizontal: 0,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.bgSoft },
    titleCol: { flex: 1, marginRight: spacing.sm },
    cardTitle: { fontWeight: "800", fontSize: typography.bodyLg, color: colors.textPrimary },
    orderId: { marginTop: 2, color: colors.textMuted, fontSize: typography.micro, fontWeight: "600" },
    statusTag: {
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      fontSize: typography.micro,
      fontWeight: "800",
    },
    metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs },
    meta: { color: colors.textSecondary, fontSize: typography.caption },
    amount: { color: colors.brandText, fontWeight: "800", fontSize: typography.body },
    tracking: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.micro },
    payHint: {
      marginTop: spacing.sm,
      color: colors.accent,
      fontSize: typography.caption,
      fontWeight: "700",
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
    actionBtn: { flexGrow: 1, minWidth: "30%" },
  });
}

export const OrderCard = memo(OrderCardInner);
