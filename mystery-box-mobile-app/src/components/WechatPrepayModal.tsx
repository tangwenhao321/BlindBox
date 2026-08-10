import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getPaymentMode } from "../config/payment";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { PrepayResult } from "../types";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  visible: boolean;
  orderId: string;
  payAmount: number;
  prepay: PrepayResult | null;
  onClose: () => void;
  onRetry?: () => void;
  onPay?: () => void | Promise<void>;
  onUseMockPay?: () => void;
};

export function WechatPrepayModal({
  visible,
  orderId,
  payAmount,
  prepay,
  onClose,
  onRetry,
  onPay,
  onUseMockPay,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildWechatPrepayStyles);
  const showDevParams = __DEV__ && getPaymentMode() === "wechat";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.mask}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t("wechatPrepay.title")}</Text>
          <Text style={styles.amount}>{formatCurrency(payAmount)}</Text>
          <Text style={styles.meta}>{t("wechatPrepay.orderId", { id: orderId })}</Text>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {prepay ? t("wechatPrepay.statusReady") : t("wechatPrepay.statusMissing")}
            </Text>
            <Text style={styles.tip}>{prepay ? t("wechatPrepay.tip") : t("wechatPrepay.noPrepay")}</Text>
            <Text style={styles.statusHint}>{t("wechatPrepay.statusHint")}</Text>
          </View>
          {showDevParams ? (
            <View style={styles.paramScroll}>
              <Text style={styles.devParamsTitle}>{t("wechatPrepay.devParamsTitle")}</Text>
              <Text style={styles.paramText}>
                {prepay ? JSON.stringify(prepay, null, 2) : t("wechatPrepay.noPrepay")}
              </Text>
            </View>
          ) : null}
          {prepay && onPay ? (
            <Pressable
              style={({ pressed }) => [styles.payBtn, pressed ? styles.pressed : null]}
              onPress={() => void onPay()}
              accessibilityRole="button"
              accessibilityLabel={t("wechatPrepay.pay")}
            >
              <Text style={styles.payBtnText}>{t("wechatPrepay.pay")}</Text>
            </Pressable>
          ) : null}
          {onRetry && !prepay ? (
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed ? styles.pressed : null]}
              onPress={onRetry}
              accessibilityRole="button"
              accessibilityLabel={t("wechatPrepay.retryPrepay")}
            >
              <Text style={styles.retryBtnText}>{t("wechatPrepay.retryPrepay")}</Text>
            </Pressable>
          ) : null}
          {onUseMockPay ? (
            <Pressable
              style={({ pressed }) => [styles.mockBtn, pressed ? styles.pressed : null]}
              onPress={onUseMockPay}
              accessibilityRole="button"
              accessibilityLabel={t("wechatPrepay.mockPay")}
            >
              <Text style={styles.mockBtnText}>{t("wechatPrepay.mockPay")}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("wechatPrepay.close")}
          >
            <Text style={styles.closeText}>{t("wechatPrepay.close")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildWechatPrepayStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    card: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.xl,
      maxHeight: "82%",
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
    statusHint: { marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.micro },
    paramScroll: {
      maxHeight: 160,
      backgroundColor: colors.bgSoft,
      borderRadius: radius.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    devParamsTitle: { fontWeight: "700", color: colors.textMuted, fontSize: typography.micro, marginBottom: spacing.xs },
    paramText: { fontFamily: "monospace", fontSize: 11, color: colors.textSecondary },
    payBtn: {
      backgroundColor: colors.mockWechatGreen,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    payBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.bodyLg },
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
