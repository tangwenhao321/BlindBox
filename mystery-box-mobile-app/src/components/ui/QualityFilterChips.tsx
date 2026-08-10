import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { PRIZE_QUALITY_FILTER_TABS, type PrizeQualityFilter } from "../../utils/qualityFilters";

type Props = {
  value: PrizeQualityFilter;
  onChange: (value: PrizeQualityFilter) => void;
};

export function QualityFilterChips({ value, onChange }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {PRIZE_QUALITY_FILTER_TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t("qualityFilter.filterA11y", { label: t(tab.labelKey) })}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : null,
              pressed ? styles.pressed : null,
            ]}
            onPress={() => onChange(tab.id)}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{t(tab.labelKey)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function buildStyles(colors: ThemeColors) {
  return {
    row: { flexDirection: "row" as const, gap: spacing.sm, paddingVertical: spacing.xs },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
    },
    chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    chipText: { fontWeight: "700" as const, color: colors.textSecondary, fontSize: typography.caption },
    chipTextActive: { color: colors.textOnBrand },
    pressed: { opacity: 0.85 },
  };
}
