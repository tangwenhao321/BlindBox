import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, layout, spacing, typography, withAlpha } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { formatCurrency } from "../../utils/formatCurrency";

type Props = {
  onPress: () => void;
  price: number;
  missionsCompleted?: number;
  missionsTotal?: number;
  latestMissionText?: string | null;
};

export function HomeNewcomerBar({
  onPress,
  price,
  missionsCompleted = 0,
  missionsTotal = 0,
  latestMissionText,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildNewcomerBarStyles);
  const priceText = formatCurrency(price);
  const showMissionProgress = missionsTotal > 0;
  // Sit just above the edge-to-edge tab bar (content height + home indicator).
  const bottomClearance = layout.tabBarClearance + Math.max(insets.bottom, spacing.xs);
  const newcomerBarGradient = [colors.brandDark, colors.brand, colors.newcomerBarGradientEnd] as const;

  const subtitle = showMissionProgress
    ? latestMissionText
      ? t("home.newcomerMissionUnclaimed", {
          done: missionsCompleted,
          total: missionsTotal,
          mission: latestMissionText,
        })
      : t("home.newcomerMissionProgress", { done: missionsCompleted, total: missionsTotal })
    : t("home.newcomerBarSub");

  return (
    <Pressable
      testID="homeNewcomerBar"
      accessibilityRole="button"
      accessibilityLabel={t("home.newcomerBarA11y", { price: priceText })}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { bottom: bottomClearance }, pressed ? styles.pressed : null]}
    >
      <AppGradient colors={[...newcomerBarGradient]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.gradient}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{t("home.newcomerBarTitle", { price: priceText })}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.btn}>
          <Text style={styles.btnText}>{t("home.newcomerBarCta")}</Text>
        </View>
      </AppGradient>
    </Pressable>
  );
}

function buildNewcomerBarStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      start: spacing.lg,
      end: spacing.lg,
      borderRadius: 16,
      overflow: "hidden",
      zIndex: 10,
      borderWidth: 1,
      borderColor: colors.brandDark,
    },
    gradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    textBlock: { flex: 1, gap: 2 },
    title: {
      ...font("bodySemiBold"),
      color: colors.textOnBrand,
      fontSize: typography.body,
      fontWeight: "800",
    },
    sub: {
      ...font("body"),
      color: withAlpha(colors.textOnBrand, 0.72),
      fontSize: typography.micro,
      fontWeight: "600",
    },
    btn: {
      backgroundColor: colors.newcomerBarCtaBg,
      borderRadius: 12,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    btnText: {
      ...font("bodySemiBold"),
      color: colors.newcomerBarCtaText,
      fontWeight: "800",
      fontSize: typography.caption,
    },
    pressed: { opacity: 0.94 },
  });
}
