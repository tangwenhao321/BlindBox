import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  ttlSeconds: number;
  poolRemaining: number;
  held: boolean;
};

export function BuyoutLockBar({ ttlSeconds, poolRemaining, held }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBuyoutLockBarStyles);
  const maxTtl = 120;
  const progress = maxTtl > 0 ? Math.min(1, ttlSeconds / maxTtl) : 0;
  return (
    <View
      style={[styles.wrap, !held ? styles.lost : null]}
      accessibilityRole="summary"
      accessibilityLabel={
        held
          ? t("buyout.lockActiveA11y", { seconds: ttlSeconds, remaining: poolRemaining })
          : t("buyout.lockExpiredA11y", { remaining: poolRemaining })
      }
    >
      <Text style={styles.title}>
        {held ? t("buyout.lockActive", { seconds: ttlSeconds }) : t("buyout.lockExpired")}
      </Text>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={t("buyout.lockProgressA11y", { percent: Math.round(progress * 100) })}
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.meta}>{t("buyout.poolRemaining", { count: poolRemaining })}</Text>
    </View>
  );
}

function buildBuyoutLockBarStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.bgSoft,
      gap: spacing.xs,
    },
    lost: { opacity: 0.6 },
    title: { fontSize: typography.body, fontWeight: "600", color: colors.textPrimary },
    track: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    fill: { height: "100%", backgroundColor: colors.brand },
    meta: { fontSize: typography.caption, color: colors.textSecondary },
  });
}
