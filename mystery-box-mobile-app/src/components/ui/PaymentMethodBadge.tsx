import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getPaymentMode } from "../../config/payment";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  name?: string;
  selected?: boolean;
};

export function PaymentMethodBadge({ name, selected = true }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildPaymentBadgeStyles);
  const mode = getPaymentMode();
  const label =
    name ??
    (mode === "vnpay"
      ? t("payment.vnpayPay")
      : mode === "mock"
        ? t("payment.methodMock")
        : t("payment.wechatPay"));
  const iconText =
    mode === "vnpay" ? t("payment.vnpayIcon") : mode === "mock" ? t("payment.wechatIcon") : t("payment.wechatIcon");
  const iconStyle = mode === "vnpay" ? styles.iconVnpay : styles.iconWechat;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, iconStyle]}>
        <Text style={styles.iconText}>{iconText}</Text>
      </View>
      <Text style={styles.name}>{label}</Text>
      {selected ? (
        <View style={styles.check}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      ) : null}
    </View>
  );
}

function buildPaymentBadgeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    icon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: "#1677FF",
      alignItems: "center",
      justifyContent: "center",
    },
    iconWechat: { backgroundColor: "#07C160" },
    iconVnpay: { backgroundColor: "#0066B3" },
    iconText: { color: "#fff", fontWeight: "900", fontSize: typography.body },
    name: { flex: 1, fontWeight: "700", color: colors.textPrimary, fontSize: typography.body },
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    checkText: { color: colors.textOnBrand, fontWeight: "900", fontSize: 12, lineHeight: 14 },
  });
}
