import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { PoolDashboard, PoolTierSummary } from "../../services/poolDashboardService";
import { qualityLabelFromRaw } from "../../utils/quality";

type Props = {
  dashboard: PoolDashboard | null;
  selectedTier?: string | null;
  onSelectTier?: (tier: string | null) => void;
};

function tierSummaryLabel(summary: PoolTierSummary, translate: TFunction) {
  return qualityLabelFromRaw(summary.qualityType, translate);
}

export function PoolTierDashboard({ dashboard, selectedTier, onSelectTier }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildPoolDashboardStyles);

  if (!dashboard) return null;
  const poolSold = Math.max(0, dashboard.poolTotal - dashboard.poolRemaining);
  const soldPct = dashboard.poolTotal > 0 ? Math.round((poolSold / dashboard.poolTotal) * 100) : 0;

  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={t("boxDetails.poolDashboardA11y")}>
      <View style={styles.hero} accessibilityLabel={t("boxDetails.poolSoldA11y", { sold: poolSold, total: dashboard.poolTotal })}>
        <Text style={styles.heroNum}>
          {poolSold}
          <Text style={styles.heroSlash}> / {dashboard.poolTotal}</Text>
        </Text>
        <Text style={styles.heroHint}>
          {t("boxDetails.poolSoldHint", { pct: soldPct, remaining: dashboard.poolRemaining })}
        </Text>
      </View>
      <View style={styles.tiers}>
        {dashboard.tiers.map((tier) => {
          const active = selectedTier === tier.qualityType;
          const tierSold = Math.max(0, tier.total - tier.remaining);
          const bar = tier.total > 0 ? Math.max(0, Math.min(1, tierSold / tier.total)) : 0;
          return (
            <Pressable
              key={tier.qualityType}
              style={[styles.tierRow, active ? styles.tierActive : null]}
              onPress={() => onSelectTier?.(active ? null : tier.qualityType)}
              accessibilityRole="button"
              accessibilityLabel={t("boxDetails.tierRowA11y", {
                tier: tierSummaryLabel(tier, t),
                sold: tierSold,
                total: tier.total,
              })}
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.tierLabel}>{tierSummaryLabel(tier, t)}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${bar * 100}%` }]} />
              </View>
              <Text style={styles.tierCount}>
                {tierSold}/{tier.total}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {dashboard.lastOne?.available ? (
        <View style={styles.lastOne}>
          <Text style={styles.lastOneBadge}>LAST ONE</Text>
          <Text style={styles.lastOneName} numberOfLines={1}>
            {dashboard.lastOne.productName}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function buildPoolDashboardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: spacing.md },
    hero: {
      backgroundColor: colors.bgSoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: "center",
    },
    heroNum: { fontSize: typography.h1, fontWeight: "800", color: colors.textPrimary },
    heroSlash: { fontSize: typography.h3, fontWeight: "600", color: colors.textMuted },
    heroHint: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.caption },
    tiers: { gap: spacing.sm },
    tierRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tierActive: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
    tierLabel: { width: 40, fontWeight: "800", fontSize: typography.caption, color: colors.textPrimary },
    barTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bgSoft,
      overflow: "hidden",
    },
    barFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 4 },
    tierCount: { width: 48, textAlign: "right", fontWeight: "700", fontSize: typography.caption, color: colors.textSecondary },
    lastOne: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgBrandSoft,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    lastOneBadge: { fontWeight: "900", fontSize: typography.micro, color: colors.brand },
    lastOneName: { flex: 1, fontWeight: "700", color: colors.textPrimary },
  });
}
