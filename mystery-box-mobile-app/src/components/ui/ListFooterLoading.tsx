import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  label?: string;
};

/** Unified list footer for pagination / load-more states. */
export function ListFooterLoading({ label }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildListFooterStyles);
  const text = label ?? t("common.loadMore");

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={text}>
      <ActivityIndicator color={colors.brand} size="small" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function buildListFooterStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    text: { color: colors.textMuted, fontSize: typography.caption },
  });
}
