import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { passwordStrength, type PasswordStrength } from "../../utils/loginValidation";

type Props = {
  password: string;
};

export function PasswordStrengthBar({ password }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildStyles);
  if (!password) return null;
  const level: PasswordStrength = passwordStrength(password);
  const fill =
    level === "strong" ? styles.fillStrong : level === "fair" ? styles.fillFair : styles.fillWeak;
  const width = level === "strong" ? "100%" : level === "fair" ? "66%" : "33%";
  return (
    <View style={styles.root} accessibilityLabel={t(`login.passwordStrength_${level}`)}>
      <View style={styles.track}>
        <View style={[styles.fill, fill, { width }]} />
      </View>
      <Text style={styles.label}>{t(`login.passwordStrength_${level}`)}</Text>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { marginTop: spacing.xs, marginBottom: spacing.sm },
    track: {
      height: 4,
      borderRadius: radius.sm,
      backgroundColor: colors.bgMuted,
      overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: radius.sm },
    fillWeak: { backgroundColor: colors.danger },
    fillFair: { backgroundColor: colors.warning },
    fillStrong: { backgroundColor: colors.brand },
    label: {
      marginTop: 4,
      fontSize: typography.micro,
      color: colors.textMuted,
      fontWeight: "600",
    },
  });
}
