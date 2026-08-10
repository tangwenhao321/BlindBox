import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { DrawPackOption } from "../DrawPackModal";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { formatCurrency } from "../../utils/formatCurrency";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  options: DrawPackOption[];
  selectedCount: number;
  onSelectCount: (count: number) => void;
};

export function DrawPackQuickSelector({ options, selectedCount, onSelectCount }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildStyles);

  if (options.length <= 1) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t("boxDetails.drawPackLabel")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((opt) => {
          const active = selectedCount === opt.count;
          return (
            <Pressable
              key={opt.count}
              style={({ pressed }) => [styles.chip, active ? styles.chipActive : null, pressed ? styles.pressed : null]}
              onPress={() => onSelectCount(opt.count)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t("boxDetails.drawPackOptionA11y", {
                label: opt.label,
                price: formatCurrency(opt.price),
              })}
            >
              <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{opt.label}</Text>
              <Text style={[styles.chipPrice, active ? styles.chipPriceActive : null]}>
                {formatCurrency(opt.price)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return {
    wrap: { gap: spacing.xs },
    label: { fontWeight: "800" as const, color: colors.textPrimary, fontSize: typography.caption },
    row: { flexDirection: "row" as const, gap: spacing.sm, paddingVertical: spacing.xs },
    chip: {
      minWidth: 88,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      alignItems: "center" as const,
    },
    chipActive: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
    chipLabel: { fontWeight: "800" as const, color: colors.textPrimary, fontSize: typography.caption },
    chipLabelActive: { color: colors.brand },
    chipPrice: { marginTop: 2, fontWeight: "700" as const, color: colors.textMuted, fontSize: typography.micro },
    chipPriceActive: { color: colors.brand },
    pressed: { opacity: 0.88 },
  };
}
