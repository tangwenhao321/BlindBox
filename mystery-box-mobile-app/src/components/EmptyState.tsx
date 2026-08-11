import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { font, radius, spacing, typography } from "../styles/tokens";
import { revealVisualTokens } from "../effects/revealVisualTokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  title: string;
  description?: string;
  /** Optional glyph override; when omitted, shows empty shelf bay illustration. */
  icon?: string;
  variant?: "card" | "plain" | "reveal";
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, icon, variant = "card", actionLabel, onAction }: Props) {
  const styles = useThemedStyles(buildEmptyStateStyles);
  return (
    <View style={[styles.wrap, variant === "plain" ? styles.wrapPlain : null, variant === "reveal" ? styles.wrapReveal : null]}>
      {icon ? (
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : (
        <View style={styles.emptyBay} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.nicheRow}>
            <View style={styles.niche} />
            <View style={styles.niche} />
            <View style={[styles.niche, styles.nicheNarrow]} />
          </View>
          <View style={styles.shelfLip} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.actionBtn, pressed ? styles.pressed : null]}
          onPress={onAction}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildEmptyStateStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapPlain: {
      marginVertical: spacing.xxl,
      backgroundColor: "transparent",
      borderWidth: 0,
    },
    wrapReveal: {
      borderRadius: revealVisualTokens.modalRadius,
      borderWidth: revealVisualTokens.borderWidth,
      shadowOpacity: revealVisualTokens.shadowOpacity,
      shadowRadius: revealVisualTokens.shadowRadius,
      elevation: revealVisualTokens.elevation,
    },
    wrap: {
      marginVertical: spacing.xl,
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
    },
    emptyBay: {
      width: 120,
      marginBottom: spacing.md,
      alignItems: "stretch",
    },
    nicheRow: {
      flexDirection: "row",
      gap: 6,
      alignItems: "flex-end",
      paddingHorizontal: 4,
    },
    niche: {
      flex: 1,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.bgSoft,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },
    nicheNarrow: {
      flex: 0.85,
      height: 28,
    },
    shelfLip: {
      marginTop: 4,
      height: 6,
      borderRadius: 2,
      backgroundColor: colors.shelfLip,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.brandDark,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.bgBrandSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    icon: { fontSize: 24, color: colors.brand },
    title: {
      ...font("bodySemiBold"),
      color: colors.textPrimary,
      fontWeight: "800",
      fontSize: typography.h4,
      textAlign: "center",
    },
    desc: {
      ...font("body"),
      marginTop: spacing.sm,
      color: colors.textMuted,
      fontSize: typography.body,
      textAlign: "center",
      lineHeight: 22,
      maxWidth: 280,
    },
    actionBtn: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.bgBrandSoft,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    actionText: { ...font("bodySemiBold"), color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    pressed: { opacity: 0.9 },
  });
}
