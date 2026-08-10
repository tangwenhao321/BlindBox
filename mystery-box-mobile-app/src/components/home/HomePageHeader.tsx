import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { useAppTheme } from "../../context/ThemeContext";
import { radius, shadows, spacing, typography } from "../../styles/tokens";

type Props = {
  onPressSearch?: () => void;
  onContactSupport?: () => void;
};

export function HomePageHeader({ onPressSearch, onContactSupport }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.md, gap: spacing.md },
        topGlow: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: radius.lg,
          opacity: 0.95,
        },
        titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        brand: { fontSize: typography.h2, fontWeight: "900", color: colors.textPrimary, letterSpacing: -0.5 },
        brandSub: { marginTop: 2, fontSize: typography.micro, color: colors.textMuted, fontWeight: "600", letterSpacing: 1 },
        serviceBtn: {
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          gap: 2,
        },
        serviceIcon: { fontSize: 22 },
        serviceText: { fontSize: typography.micro, color: colors.textSecondary, fontWeight: "700" },
        searchWrap: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.bgCard,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          minHeight: 46,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.cardSm,
        },
        searchIcon: { fontSize: 16, marginEnd: spacing.sm },
        searchPlaceholder: { flex: 1, fontSize: typography.body, color: colors.textPlaceholder, paddingVertical: spacing.sm },
        pressed: { opacity: 0.85 },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap}>
      <AppGradient colors={[colors.bgPage, colors.bgCard]} style={styles.topGlow} />
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.brand}>{t("home.brand")}</Text>
          <Text style={styles.brandSub}>{t("home.brandSub")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.contactSupport")}
          onPress={onContactSupport}
          style={({ pressed }) => [styles.serviceBtn, pressed ? styles.pressed : null]}
        >
          <Text style={styles.serviceIcon}>🎧</Text>
          <Text style={styles.serviceText}>{t("home.support")}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.search")}
        onPress={onPressSearch}
        style={({ pressed }) => [styles.searchWrap, pressed ? styles.pressed : null]}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>{t("home.searchPlaceholder")}</Text>
      </Pressable>
    </View>
  );
}
