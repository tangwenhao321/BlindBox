import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ORDER_STATUS } from "../config/constants";
import { PayCountdownText } from "./ui/PayCountdownText";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { usePendingPaymentCountdownLabels } from "../hooks/usePendingPaymentCountdownLabels";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { Order } from "../types";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  orders: Order[];
  authToken?: string;
  onContinue: (orderId: string) => void;
  onViewAllPending?: () => void;
};

export function PendingPaymentBanner({ orders, authToken, onContinue, onViewAllPending }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildPendingPaymentStyles);
  const countdownLabels = usePendingPaymentCountdownLabels();
  const pendingList = orders.filter((o) => o.status === ORDER_STATUS.TO_BE_PAID);
  if (!pendingList.length) return null;

  const primary = pendingList[0];
  const amount = primary.baseOrder?.payment?.payAmount;
  const extra = pendingList.length - 1;

  return (
    <View style={styles.wrap} testID="pendingPaymentBanner">
      <Pressable
        style={styles.banner}
        onPress={() => onContinue(primary.id)}
        accessibilityRole="button"
        accessibilityLabel={
          extra > 0
            ? t("pendingPayment.a11yMultiple", { count: pendingList.length })
            : t("pendingPayment.a11ySingle")
        }
        testID="pendingPaymentBannerCta"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {extra > 0
              ? t("pendingPayment.multiple", { count: pendingList.length })
              : t("pendingPayment.single")}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {primary.items?.[0]?.mysteryBox?.name || t("pendingPayment.orderFallback")}
            {typeof amount === "number" ? ` · ${formatCurrency(amount)}` : ""}
          </Text>
          {authToken ? (
            <PayCountdownText
              authToken={authToken}
              orderId={primary.id}
              prefix={countdownLabels.prefix}
              expiredLabel={countdownLabels.expiredLabel}
              style={styles.countdown}
            />
          ) : null}
        </View>
        <Text style={styles.cta}>{t("pendingPayment.payNow")}</Text>
      </Pressable>
      {extra > 0 && onViewAllPending ? (
        <Pressable
          onPress={onViewAllPending}
          style={styles.moreLink}
          accessibilityRole="button"
          accessibilityLabel={t("pendingPayment.a11yViewAll")}
        >
          <Text style={styles.moreText}>{t("pendingPayment.viewAll")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildPendingPaymentStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
    banner: {
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.warningSoftBorder,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    title: { fontWeight: "800", color: colors.textPrimary },
    sub: { marginTop: 2, color: colors.textSecondary, fontSize: typography.caption },
    countdown: { marginTop: 4 },
    cta: { color: colors.brand, fontWeight: "900" },
    moreLink: { alignSelf: "flex-end", paddingVertical: 2 },
    moreText: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
  });
}
