import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

export function AppLoadingSplash() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildAppLoadingSplashStyles);

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={t("appLoading.a11y")}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{t("appLoading.badge")}</Text>
      </View>
      <Text style={styles.title}>{t("appLoading.title")}</Text>
      <Text style={styles.subtitle}>{t("appLoading.subtitle")}</Text>
      <ActivityIndicator size="small" color={colors.brand} style={styles.spinner} />
    </View>
  );
}

function buildAppLoadingSplashStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bgPage,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    badge: {
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
      ...shadows.float,
    },
    badgeText: { color: colors.textOnBrand, fontSize: 32, fontWeight: "800" },
    title: { fontSize: typography.h2, fontWeight: "800", color: colors.textPrimary },
    subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.body },
    spinner: { marginTop: spacing.xl },
  });
}
