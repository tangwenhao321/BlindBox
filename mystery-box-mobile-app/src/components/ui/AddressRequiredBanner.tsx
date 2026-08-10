import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  visible: boolean;
  onAdd: () => void;
  onDismiss?: () => void;
};

export function AddressRequiredBanner({ visible, onAdd, onDismiss }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildAddressBannerStyles);

  if (!visible) return null;
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.text}>{t("address.bannerText")}</Text>
      <Pressable style={styles.btn} onPress={onAdd} accessibilityRole="button" accessibilityLabel={t("address.bannerAddA11y")}>
        <Text style={styles.btnText}>{t("address.bannerAdd")}</Text>
      </Pressable>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("address.bannerDismissA11y")}>
          <Text style={styles.dismiss}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildAddressBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.warningSoftBorder,
    },
    text: { flex: 1, color: colors.textPrimary, fontSize: typography.caption, fontWeight: "600" },
    btn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
    },
    btnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
    dismiss: { fontSize: 20, color: colors.textMuted, paddingHorizontal: spacing.xs },
  });
}
