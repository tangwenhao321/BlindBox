import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  onContinuePay: () => void;
  onClaimAndContinue?: () => void;
  onLeaveDirect: () => void;
  offerEligible?: boolean;
  offerDiscount?: number;
  claiming?: boolean;
};

export function PaymentAbandonPanel({
  onContinuePay,
  onClaimAndContinue,
  onLeaveDirect,
  offerEligible = true,
  offerDiscount = 0,
  claiming = false,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildStyles);
  const showClaim = offerEligible && !!onClaimAndContinue;
  const discountLabel = offerDiscount > 0 ? formatCurrency(offerDiscount) : "";

  return (
    <>
      <Text style={styles.title}>{t("payment.abandonTitle")}</Text>
      <Text style={styles.tip}>
        {showClaim
          ? discountLabel
            ? t("payment.abandonTipWithAmount", { amount: discountLabel })
            : t("payment.abandonTip")
          : t("payment.abandonTipNoOffer")}
      </Text>
      {showClaim ? (
        <Pressable
          style={[styles.payBtn, claiming ? styles.disabled : null]}
          onPress={claiming ? undefined : onClaimAndContinue}
          testID="mockPayLeaveButton"
          accessibilityRole="button"
          accessibilityLabel={t("payment.claimAndContinuePay")}
          disabled={claiming}
        >
          {claiming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>{t("payment.claimAndContinuePay")}</Text>
          )}
        </Pressable>
      ) : null}
      <Pressable
        style={showClaim ? styles.secondaryBtn : styles.payBtn}
        onPress={claiming ? undefined : onContinuePay}
        accessibilityRole="button"
        accessibilityLabel={t("payment.continuePay")}
        disabled={claiming}
      >
        <Text style={showClaim ? styles.secondaryBtnText : styles.payBtnText}>
          {t("payment.continuePay")}
        </Text>
      </Pressable>
      <Pressable
        style={styles.cancelBtn}
        onPress={claiming ? undefined : onLeaveDirect}
        testID="mockPayLeaveDirectButton"
        accessibilityRole="button"
        accessibilityLabel={t("payment.leaveDirect")}
        disabled={claiming}
      >
        <Text style={styles.cancelText}>{t("payment.leaveDirect")}</Text>
      </Pressable>
    </>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
    tip: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 18,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    payBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    payBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.bodyLg },
    secondaryBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    secondaryBtnText: { color: colors.textPrimary, fontWeight: "700", fontSize: typography.bodyLg },
    cancelBtn: { marginTop: spacing.md, alignItems: "center", paddingVertical: spacing.sm },
    cancelText: { color: colors.textSecondary, fontWeight: "600" },
    disabled: { opacity: 0.7 },
  });
}
