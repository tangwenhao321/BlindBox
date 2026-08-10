import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  todayDrawCount: number;
  todayLegendaryCount: number;
};

export function HomeStatsBar({ todayDrawCount, todayLegendaryCount }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildStatsStyles);

  return (
    <View style={styles.wrap}>
      <View style={styles.item}>
        <Text style={styles.value}>{todayDrawCount}</Text>
        <Text style={styles.label}>{t("home.statsTodayDraws")}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={[styles.value, styles.legend]}>{todayLegendaryCount}</Text>
        <Text style={styles.label}>{t("home.statsTodayLegend")}</Text>
      </View>
    </View>
  );
}

function buildStatsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      backgroundColor: colors.bgSoft,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginHorizontal: layout.screenPaddingX,
      marginBottom: spacing.md,
    },
    item: { flex: 1, alignItems: "center" },
    divider: { width: 1, backgroundColor: colors.border },
    value: { fontSize: typography.h3, fontWeight: "800", color: colors.textPrimary },
    legend: { color: colors.accentOrange },
    label: { fontSize: typography.caption, color: colors.textSecondary, marginTop: 2 },
  });
}
