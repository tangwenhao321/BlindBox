import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout, radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "accent";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  accessibilityLabel,
  testID,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildPrimaryButtonStyles);
  const isPrimary = variant === "primary";
  const isAccent = variant === "accent";
  const isSecondary = variant === "secondary";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : isAccent ? styles.accent : isSecondary ? styles.secondary : styles.ghost,
        (disabled || loading) ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isAccent ? colors.textOnBrand : colors.brand} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary || isAccent ? styles.textOnBrand : isSecondary ? styles.textBrand : styles.textMuted,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function buildPrimaryButtonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      minHeight: layout.buttonMinHeight,
    },
    primary: {
      backgroundColor: colors.brand,
      ...shadows.cardSm,
    },
    accent: {
      backgroundColor: colors.accent,
      ...shadows.cardSm,
    },
    secondary: {
      backgroundColor: colors.bgBrandSoft,
      borderWidth: 1.5,
      borderColor: colors.brand,
    },
    ghost: {
      backgroundColor: colors.bgSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    text: { fontWeight: "800", fontSize: typography.body },
    textOnBrand: { color: colors.textOnBrand },
    textBrand: { color: colors.brandText },
    textMuted: { color: colors.textSecondary },
  });
}
