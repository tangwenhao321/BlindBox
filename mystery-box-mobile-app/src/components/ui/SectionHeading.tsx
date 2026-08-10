import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

export function SectionHeading({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildSectionHeadingStyles);
  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, { backgroundColor: accent ?? colors.brand }]} />
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function buildSectionHeadingStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
    bar: { width: 4, height: 28, borderRadius: 2 },
    title: { fontSize: typography.h4, fontWeight: "900", color: colors.textPrimary },
    sub: { marginTop: 2, fontSize: typography.micro, color: colors.textMuted, fontWeight: "700", letterSpacing: 0.8 },
  });
}
