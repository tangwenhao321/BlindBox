import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import { normalizeQualityTier, qualityLabel, resolveQualityColors } from "../../utils/quality";
import { radius, spacing, typography } from "../../styles/tokens";

type Props = { tier?: string | null; compact?: boolean };

export function QualityBadge({ tier, compact }: Props) {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const normalized = normalizeQualityTier(tier);
  const palette = resolveQualityColors(normalized, isDark);

  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg, borderColor: palette.border }, compact ? styles.compact : null]}>
      <Text style={[styles.text, { color: palette.text }]}>{qualityLabel(normalized, t)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  compact: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  text: { fontSize: typography.caption, fontWeight: "800" },
});
