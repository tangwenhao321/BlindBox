import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import { font, radius, spacing, typography } from "../../styles/tokens";

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
        titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
        brandBlock: { flex: 1, gap: spacing.xs },
        brand: {
          ...font("bodySemiBold"),
          fontSize: typography.display,
          color: colors.brandText,
          letterSpacing: 0.5,
          lineHeight: 38,
          fontWeight: "700",
        },
        brandSub: {
          ...font("body"),
          fontSize: typography.body,
          color: colors.textSecondary,
          lineHeight: 22,
          maxWidth: 280,
        },
        ctaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        serviceBtn: {
          alignItems: "center",
          justifyContent: "center",
          minHeight: 40,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.borderSoft,
          backgroundColor: colors.bgSoft,
        },
        serviceText: {
          ...font("bodySemiBold"),
          fontSize: typography.caption,
          color: colors.brand,
        },
        searchWrap: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.bgSoft,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          minHeight: 46,
          borderWidth: 1,
          borderColor: colors.border,
        },
        searchLabel: {
          ...font("bodyMedium"),
          fontSize: typography.caption,
          color: colors.brand,
          marginEnd: spacing.sm,
        },
        searchPlaceholder: {
          ...font("body"),
          flex: 1,
          fontSize: typography.body,
          color: colors.textPlaceholder,
          paddingVertical: spacing.sm,
        },
        pressed: { opacity: 0.85 },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>{t("home.brand")}</Text>
          <Text style={styles.brandSub}>{t("home.brandSub")}</Text>
        </View>
        <View style={styles.ctaRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.contactSupport")}
            onPress={onContactSupport}
            style={({ pressed }) => [styles.serviceBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.serviceText}>{t("home.support")}</Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.search")}
        onPress={onPressSearch}
        style={({ pressed }) => [styles.searchWrap, pressed ? styles.pressed : null]}
      >
        <Text style={styles.searchLabel}>{t("home.search")}</Text>
        <Text style={styles.searchPlaceholder}>{t("home.searchPlaceholder")}</Text>
      </Pressable>
    </View>
  );
}
