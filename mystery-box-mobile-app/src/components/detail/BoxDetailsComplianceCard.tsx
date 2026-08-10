import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SUPPORT_HOTLINE } from "../../config/constants";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
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
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    complianceTitle: { fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.xs },
    complianceText: { color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  });
}
