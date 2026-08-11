import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

export function MallPageHeader() {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildMallHeaderStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{t("mall.shelfEyebrow")}</Text>
      <Text style={styles.title}>{t("mall.title")}</Text>
      <Text style={styles.tags}>{t("mall.tags")}</Text>
    </View>
  );
}

function buildMallHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md, gap: spacing.xs },
    eyebrow: {
      ...font("bodySemiBold"),
      fontSize: typography.micro,
      color: colors.brand,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    title: {
      ...font("bodySemiBold"),
      fontSize: typography.h1,
      color: colors.brandText,
      letterSpacing: 0.5,
    },
    tags: { ...font("body"), fontSize: typography.caption, color: colors.textMuted },
  });
}
