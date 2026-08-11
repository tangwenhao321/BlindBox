import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SUPPORT_HOTLINE } from "../../config/constants";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

export function BoxDetailsComplianceCard() {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildComplianceStyles);

  return (
    <View style={styles.complianceCard}>
      <Text style={styles.complianceTitle}>{t("boxDetails.complianceTitle")}</Text>
      <Text style={styles.complianceText}>{t("boxDetails.complianceText")}</Text>
      {SUPPORT_HOTLINE ? (
        <Text style={styles.complianceText}>{t("boxDetails.complianceHotline", { phone: SUPPORT_HOTLINE })}</Text>
      ) : null}
    </View>
  );
}

function buildComplianceStyles(colors: ThemeColors) {
  return StyleSheet.create({
    complianceCard: {
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    complianceTitle: {
      ...font("bodyMedium"),
      color: colors.textMuted,
      marginBottom: spacing.xs,
      fontSize: typography.caption,
    },
    complianceText: {
      ...font("body"),
      color: colors.textMuted,
      fontSize: typography.micro,
      lineHeight: 18,
    },
  });
}
