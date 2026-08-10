import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  message: string;
  onRetry?: () => void;
  onContactSupport?: () => void;
};

/** Compact inline error for detail sections (logistics, pool insight, etc.). */
export function InlineSectionError({ message, onRetry, onContactSupport }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildInlineErrorStyles);

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.retryLoadA11y")}
            onPress={onRetry}
            hitSlop={8}
          >
            <Text style={styles.action}>{t("common.retry")}</Text>
          </Pressable>
        ) : null}
        {onContactSupport ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.contactSupport")}
            onPress={onContactSupport}
            hitSlop={8}
          >
            <Text style={styles.action}>{t("common.contactSupport")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function buildInlineErrorStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    message: { color: colors.danger, fontSize: typography.caption, lineHeight: 18 },
    actions: { marginTop: spacing.sm, flexDirection: "row", gap: spacing.md },
    action: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  });
}
