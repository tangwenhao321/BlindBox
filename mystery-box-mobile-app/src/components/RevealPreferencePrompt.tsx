import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  visible: boolean;
  onKeepAnimations: () => void;
  onTextOnly: () => void;
};

export function RevealPreferencePrompt({ visible, onKeepAnimations, onTextOnly }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildRevealPreferenceStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepAnimations}>
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("revealPrompt.title")}</Text>
          <Text style={styles.body}>{t("revealPrompt.body")}</Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
            onPress={onKeepAnimations}
            accessibilityRole="button"
            accessibilityLabel={t("revealPrompt.keep")}
          >
            <Text style={styles.primaryText}>{t("revealPrompt.keep")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
            onPress={onTextOnly}
            accessibilityRole="button"
            accessibilityLabel={t("revealPrompt.textOnly")}
          >
            <Text style={styles.secondaryText}>{t("revealPrompt.textOnly")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function buildRevealPreferenceStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    title: { fontSize: typography.h4, fontWeight: "900", color: colors.textPrimary },
    body: {
      marginTop: spacing.sm,
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    primaryBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    primaryText: { color: colors.textOnBrand, fontWeight: "800" },
    secondaryBtn: {
      marginTop: spacing.sm,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryText: { color: colors.textPrimary, fontWeight: "700" },
    pressed: { opacity: 0.9 },
  });
}
