import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

const TRUST_ITEMS = [
  { icon: "◎", labelKey: "home.trustProbability", action: "probability" as const },
  { icon: "✓", labelKey: "home.trustAuthentic", action: "authentic" as const },
  { icon: "★", labelKey: "home.trustGuaranteed", action: "playGuide" as const },
];

type Props = {
  onPressProbability?: () => void;
  onPressPlayGuide?: () => void;
};

export function HomeTrustBadges({ onPressProbability, onPressPlayGuide }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildTrustStyles);

  return (
    <View style={styles.trustRow}>
      {TRUST_ITEMS.map((item) => {
        const onPress =
          item.action === "probability"
            ? onPressProbability
            : item.action === "playGuide"
              ? onPressPlayGuide
              : undefined;
        const label = t(item.labelKey);
        const content = (
          <>
            <Text style={styles.trustIcon}>{item.icon}</Text>
            <Text style={styles.trustLabel}>{label}</Text>
          </>
        );
        if (!onPress) {
          return (
            <View key={item.labelKey} style={styles.trustItem}>
              {content}
            </View>
          );
        }
        return (
          <Pressable
            key={item.labelKey}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            style={({ pressed }) => [styles.trustItem, pressed ? styles.pressed : null]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}

function buildTrustStyles(colors: ThemeColors) {
  return StyleSheet.create({
    trustRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
      backgroundColor: colors.bgCard,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    trustItem: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.xs },
    trustIcon: { fontSize: 11, color: colors.brand, fontWeight: "800" },
    trustLabel: { fontSize: typography.micro, color: colors.textSecondary, fontWeight: "700" },
    pressed: { opacity: 0.85 },
  });
}
