import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  onPressProbability?: () => void;
  onPressPlayGuide?: () => void;
};

/** Single compact trust line under the hero banner — max one row. */
export function HomeTrustBadges({ onPressProbability, onPressPlayGuide }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildTrustStyles);
  const line = [t("home.trustProbability"), t("home.trustAuthentic"), t("home.trustGuaranteed")].join(" · ");
  const onPress = onPressProbability ?? onPressPlayGuide;

  if (!onPress) {
    return (
      <View style={styles.trustRow}>
        <Text style={styles.trustLabel} numberOfLines={1}>
          {line}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={line}
      onPress={onPress}
      style={({ pressed }) => [styles.trustRow, pressed ? styles.pressed : null]}
    >
      <Text style={styles.trustLabel} numberOfLines={1}>
        {line}
      </Text>
    </Pressable>
  );
}

function buildTrustStyles(colors: ThemeColors) {
  return StyleSheet.create({
    trustRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    trustLabel: {
      ...font("body"),
      flexShrink: 1,
      fontSize: typography.micro,
      color: colors.textMuted,
      fontWeight: "600",
      letterSpacing: 0.2,
      textAlign: "center",
    },
    pressed: { opacity: 0.85 },
  });
}
