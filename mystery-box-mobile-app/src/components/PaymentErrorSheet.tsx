import { Clipboard, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { formatCurrency } from "../utils/formatCurrency";
import { formatOrderIdDisplay } from "../order-utils";
import { openContactSupport } from "../utils/contactSupport";
import { toast } from "../utils/toast";

export type PaymentErrorChannel = "wechat" | "vnpay" | "momo";

type Props = {
  visible: boolean;
  orderId: string;
  payAmount: number;
  message: string;
  channel: PaymentErrorChannel;
  onClose: () => void;
  onRetry: () => void;
};

export function PaymentErrorSheet({
  visible,
  orderId,
  payAmount,
  message,
  channel,
  onClose,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildPaymentErrorStyles);

  const copyOrderId = () => {
    Clipboard.setString(orderId);
    toast.success(t("paymentError.orderCopied"));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.cancel")}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t("paymentError.title")}</Text>
          <Text style={styles.amount}>{formatCurrency(payAmount)}</Text>
          <Text style={styles.meta}>
            {t("paymentError.orderId", { id: formatOrderIdDisplay(orderId) })}
          </Text>
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{message || t("payment.failFallback")}</Text>
            <Text style={styles.channelHint}>
              {channel === "vnpay"
                ? t("paymentError.channelVnpay")
                : channel === "momo"
                  ? t("paymentError.channelMomo")
                  : t("paymentError.channelWechat")}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={t("paymentError.retry")}
          >
            <Text style={styles.primaryBtnText}>{t("paymentError.retry")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
            onPress={copyOrderId}
            accessibilityRole="button"
            accessibilityLabel={t("paymentError.copyOrder")}
          >
            <Text style={styles.secondaryBtnText}>{t("paymentError.copyOrder")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.supportBtn, pressed ? styles.pressed : null]}
            onPress={() => void openContactSupport()}
            accessibilityRole="button"
            accessibilityLabel={t("common.contactSupport")}
          >
            <Text style={styles.supportBtnText}>{t("common.contactSupport")}</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("paymentError.close")}>
            <Text style={styles.closeText}>{t("paymentError.close")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildPaymentErrorStyles(colors: ThemeColors) {
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
    errorBox: {
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    errorText: { color: colors.danger, fontSize: typography.caption, lineHeight: 20, fontWeight: "600" },
    channelHint: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.micro },
    primaryBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    primaryBtnText: { color: colors.textOnBrand, fontWeight: "800" },
    secondaryBtn: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: { color: colors.textSecondary, fontWeight: "700" },
    supportBtn: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
      backgroundColor: colors.bgSoft,
    },
    supportBtnText: { color: colors.brand, fontWeight: "700" },
    closeBtn: { alignItems: "center", paddingVertical: spacing.sm },
    closeText: { color: colors.link, fontWeight: "700" },
    pressed: { opacity: 0.9 },
  });
}
