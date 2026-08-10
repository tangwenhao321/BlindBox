import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ListErrorBanner({ message, onRetry }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildListErrorStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable
          style={styles.btn}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t("common.retryLoadA11y")}
        >
          <Text style={styles.btnText}>{t("common.retry")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildListErrorStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.lg,
      marginVertical: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger,
      gap: spacing.sm,
    },
    text: { color: colors.danger, fontSize: typography.caption, fontWeight: "600" },
    btn: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.bgCard,
    },
    btnText: { color: colors.danger, fontWeight: "800", fontSize: typography.caption },
  });
}
