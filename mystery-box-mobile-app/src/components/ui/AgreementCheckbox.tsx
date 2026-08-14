import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  checked: boolean;
  onToggle: () => void;
  children: string;
};

export function AgreementCheckbox({ checked, onToggle, children }: Props) {
  const styles = useThemedStyles(buildAgreementCheckboxStyles);
  return (
    <Pressable
      style={styles.row}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={children}
    >
      <View style={[styles.box, checked ? styles.boxChecked : null]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

function buildAgreementCheckboxStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    box: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    boxChecked: { backgroundColor: colors.brand, borderColor: colors.brand },
    tick: { color: colors.textOnBrand, fontSize: 11, fontWeight: "900", lineHeight: 12 },
    text: { flex: 1, color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  });
}
