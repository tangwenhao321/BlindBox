import { StyleSheet } from "react-native";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, shadows, spacing, typography } from "./tokens";
import type { ThemeColors } from "./themes";

export function buildScreenStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pageHeader: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    screenCard: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    screenCardFlush: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      overflow: "hidden",
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    pageTitle: {
      fontSize: typography.h2,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.5,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      fontSize: typography.h4,
      fontWeight: "800",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    pageSubtitle: {
      color: colors.textSecondary,
      fontSize: typography.body,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    backLink: {
      color: colors.brand,
      fontWeight: "700",
      fontSize: typography.caption,
      marginBottom: spacing.md,
    },
    backLinkPressed: { opacity: 0.7 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.borderSoft,
      borderRadius: radius.sm,
      backgroundColor: colors.bgSoft,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
      minHeight: layout.inputMinHeight,
      fontSize: typography.body,
      color: colors.textPrimary,
    },
    searchInput: {
      borderWidth: 1.5,
      borderColor: colors.borderSoft,
      borderRadius: radius.pill,
      backgroundColor: colors.bgCard,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: typography.body,
      color: colors.textPrimary,
      ...shadows.cardSm,
    },
    primaryBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: layout.buttonMinHeight,
      ...shadows.cardSm,
    },
    primaryText: {
      color: colors.textOnBrand,
      fontWeight: "800",
      fontSize: typography.body,
    },
    secondaryBtn: {
      borderWidth: 1.5,
      borderColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bgBrandSoft,
      minHeight: layout.buttonMinHeight,
    },
    secondaryText: {
      color: colors.brandText,
      fontWeight: "800",
      fontSize: typography.body,
    },
    chipBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.pill,
      backgroundColor: colors.bgCard,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    chipBtnActive: {
      borderColor: colors.brand,
      backgroundColor: colors.bgBrandSoft,
    },
    chipText: {
      color: colors.textSecondary,
      fontWeight: "700",
      fontSize: typography.caption,
    },
    chipTextActive: {
      color: colors.brandText,
    },
    metaText: {
      color: colors.textMuted,
      fontSize: typography.caption,
    },
    hintText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    bannerImage: {
      width: "100%",
      height: 200,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
    disabled: { opacity: 0.45 },
    accentBar: {
      height: 4,
      width: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      marginBottom: spacing.sm,
    },
  });
}

/** Theme-aware shared screen styles. */
export function useScreenStyles() {
  return useThemedStyles(buildScreenStyles);
}
