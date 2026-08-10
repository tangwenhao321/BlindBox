import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../hooks/useThemedStyles";
import type { SeriesDrawStatistics } from "../services/fairnessService";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { qualityLabelFromRaw } from "../utils/quality";

type Props = {
  stats: SeriesDrawStatistics;
  compact?: boolean;
};

export function SeriesDrawStatisticsSection({ stats, compact = false }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildSeriesStatsStyles);

  if (stats.totalDraws <= 0 && !stats.tiers.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{t("seriesStats.title")}</Text>
        <Text style={styles.muted}>{t("seriesStats.empty")}</Text>
      </View>
    );
  }

  const configuredTotal =
    stats.configuredLegendaryRate + stats.configuredHiddenRate + stats.configuredGeneralRate;

  return (
    <View style={[styles.card, compact ? styles.cardCompact : null]}>
      <Text style={styles.title}>{t("seriesStats.title")}</Text>
      <Text style={styles.meta}>
        {stats.mysteryBoxName
          ? t("seriesStats.meta", { name: stats.mysteryBoxName, count: stats.totalDraws })
          : t("seriesStats.metaNoName", { count: stats.totalDraws })}
      </Text>
      {configuredTotal > 0 ? (
        <Text style={styles.configured}>
          {t("seriesStats.configured", {
            legendary: stats.configuredLegendaryRate,
            hidden: stats.configuredHiddenRate,
            general: stats.configuredGeneralRate,
          })}
        </Text>
      ) : null}
      <View style={styles.tierList}>
        {stats.tiers.map((tier) => (
          <View key={tier.qualityType} style={styles.tierRow}>
            <Text style={styles.tierLabel}>{qualityLabelFromRaw(tier.qualityType, t)}</Text>
            <Text style={styles.tierValue}>
              {t("seriesStats.tierRow", { count: tier.count, percent: tier.actualPercent.toFixed(2) })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildSeriesStatsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    cardCompact: { marginTop: spacing.sm },
    title: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
    meta: { fontSize: typography.caption, color: colors.textSecondary },
    configured: { fontSize: typography.micro, color: colors.textMuted, lineHeight: 18 },
    muted: { fontSize: typography.caption, color: colors.textMuted },
    tierList: { marginTop: spacing.xs, gap: 4 },
    tierRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    tierLabel: { fontWeight: "700", color: colors.textPrimary, fontSize: typography.caption },
    tierValue: { color: colors.textSecondary, fontSize: typography.caption },
  });
}
