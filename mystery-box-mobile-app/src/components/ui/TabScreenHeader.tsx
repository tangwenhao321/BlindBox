import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  title: string;
  variant?: "default" | "profile";
  rightSlot?: ReactNode;
};

export function TabScreenHeader({ title, variant = "default", rightSlot }: Props) {
  const styles = useThemedStyles(buildTabScreenHeaderStyles);
  const isProfile = variant === "profile";
  return (
    <View style={[styles.wrap, isProfile ? styles.wrapProfile : styles.wrapDefault]}>
      <View style={styles.row}>
        <View style={styles.side} />
        <Text style={[styles.title, isProfile ? styles.titleProfile : null]}>{title}</Text>
        <View style={styles.side}>{rightSlot ?? null}</View>
      </View>
    </View>
  );
}

export function HeaderIconButton({
  label,
  icon,
  badge,
  onPress,
  testID,
}: {
  label: string;
  icon?: string;
  badge?: number;
  onPress: () => void;
  testID?: string;
}) {
  const styles = useThemedStyles(buildTabScreenHeaderStyles);
  const displayIcon = icon ?? label.charAt(0);
  const badgeText = badge != null && badge > 0 ? (badge > 99 ? "99+" : badge > 9 ? "9+" : String(badge)) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, pressed ? styles.pressed : null]}
    >
      <Text style={styles.iconBtnText}>{displayIcon}</Text>
      {badgeText ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {badgeText}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function buildTabScreenHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    wrapDefault: {
      backgroundColor: colors.bgCard,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    wrapProfile: {
      backgroundColor: colors.profileHeaderBg,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 40,
    },
    side: {
      width: 88,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: spacing.xs,
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: typography.h4,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: 0.5,
    },
    titleProfile: {
      fontSize: typography.h3,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      position: "relative",
      overflow: "visible",
    },
    iconBtnText: { fontSize: 17 },
    badge: {
      position: "absolute",
      top: -4,
      right: -6,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: colors.profileHeaderBg,
    },
    badgeText: {
      color: colors.textOnBrand,
      fontSize: 10,
      fontWeight: "900",
      lineHeight: 12,
      textAlign: "center",
    },
    pressed: { opacity: 0.85 },
  });
}
