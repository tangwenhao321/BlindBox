import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBoxInsight } from "../../services/boxInsightService";
import type { PityProgress } from "../../services/pityService";
import { pityPercentOf } from "./boxDetailsBenefitUtils";

type Props = {
  pityProgress: PityProgress | null;
  insight: MysteryBoxInsight | null;
};

export function BoxDetailsBenefitCards({ pityProgress, insight }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBenefitStyles);
  const showDesignated = !!insight?.designatedBenefitRemaining && insight.designatedBenefitRemaining > 0;

  if (!pityProgress && !showDesignated) return null;

  return (
    <>
      {pityProgress ? (
        <View style={styles.pityCard}>
          <Text style={styles.pityTitle}>{t("boxDetails.pityTitle")}</Text>
          <Text style={styles.pityHint}>
            {t("boxDetails.pityHint", {
              current: pityProgress.current,
              threshold: pityProgress.threshold,
              remaining: pityProgress.remaining,
            })}
          </Text>
          <View style={styles.pityTrack}>
            <View style={[styles.pityFill, { width: `${pityPercentOf(pityProgress)}%` }]} />
          </View>
        </View>
      ) : null}
      {showDesignated ? (
        <View style={styles.designatedCard}>
          <Text style={styles.designatedTitle}>{t("boxDetails.designatedTitle")}</Text>
          <Text style={styles.designatedHint}>
            {insight?.designatedBenefitHint ||
              t("boxDetails.designatedHintDefault", { count: insight?.designatedBenefitRemaining })}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function buildBenefitStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pityCard: {
      backgroundColor: colors.bgBrandSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    pityTitle: { fontWeight: "800", color: colors.brandText, marginBottom: spacing.xs },
    pityHint: { fontSize: typography.caption, color: colors.textSecondary, lineHeight: 18 },
    pityTrack: {
      marginTop: spacing.sm,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.bgSoft,
      overflow: "hidden",
    },
    pityFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 3 },
    designatedCard: {
      backgroundColor: colors.violetSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.violetPanelBorder,
    },
    designatedTitle: { fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.xs },
    designatedHint: { fontSize: typography.caption, color: colors.textSecondary, lineHeight: 18 },
  });
}
