import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  title: string;
  body: string;
  onDismiss: () => void;
  testID?: string;
};

export function InlineGuideBanner({ title, body, onDismiss, testID }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildGuideBannerStyles);

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Pressable
        onPress={onDismiss}
        style={styles.dismissBtn}
        accessibilityRole="button"
        accessibilityLabel={t("common.gotIt")}
      >
        <Text style={styles.dismissText}>{t("common.gotIt")}</Text>
      </Pressable>
    </View>
  );
}

function buildGuideBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.bgBrandSoft,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    content: { gap: spacing.xs },
    title: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.caption },
    body: { color: colors.textSecondary, fontSize: typography.micro, lineHeight: 18 },
    dismissBtn: { alignSelf: "flex-end" },
    dismissText: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  });
}
