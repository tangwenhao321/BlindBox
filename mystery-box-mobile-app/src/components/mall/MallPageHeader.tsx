import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

export function MallPageHeader() {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildMallHeaderStyles);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("mall.title")}</Text>
      <Text style={styles.tags}>{t("mall.tags")}</Text>
    </View>
  );
}

function buildMallHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md, gap: spacing.xs },
    title: { fontSize: typography.h1, fontWeight: "900", color: colors.textPrimary, letterSpacing: -0.5 },
    tags: { fontSize: typography.caption, color: colors.textMuted, fontWeight: "600" },
  });
}
