import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
      <LinearGradient
        colors={[colors.brandDark, colors.brand, colors.brandGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <View style={styles.badgeInner}>
          <Text style={styles.badgeText}>{t("appLoading.badge")}</Text>
        </View>
      </LinearGradient>
      <Text style={styles.title}>{t("appLoading.title")}</Text>
      <Text style={styles.subtitle}>{t("appLoading.subtitle")}</Text>
      <ActivityIndicator size="small" color={colors.brandGradientEnd} style={styles.spinner} />
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
      width: 76,
      height: 76,
      borderRadius: radius.lg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
      padding: 2,
      ...shadows.float,
    },
    badgeInner: {
      flex: 1,
      alignSelf: "stretch",
      borderRadius: radius.lg - 2,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.brand,
    },
    badgeText: { color: colors.brandDark, fontSize: 28, fontWeight: "800" },
    title: { fontSize: typography.h2, fontWeight: "800", color: colors.textPrimary },
    subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.body },
    spinner: { marginTop: spacing.xl },
  });
}
