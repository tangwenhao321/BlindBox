import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../styles/tokens";
import { revealVisualTokens } from "../effects/revealVisualTokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  title: string;
  description?: string;
  icon?: string;
  variant?: "card" | "plain" | "reveal";
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, icon = "✦", variant = "card", actionLabel, onAction }: Props) {
  const styles = useThemedStyles(buildEmptyStateStyles);
  return (
    <View style={[styles.wrap, variant === "plain" ? styles.wrapPlain : null, variant === "reveal" ? styles.wrapReveal : null]}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={styles.actionBtn}
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
      shadowOpacity: 0,
      elevation: 0,
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
      ...shadows.cardSm,
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
      color: colors.textPrimary,
      fontWeight: "800",
      fontSize: typography.h4,
      textAlign: "center",
    },
    desc: {
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
    actionText: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  });
}
