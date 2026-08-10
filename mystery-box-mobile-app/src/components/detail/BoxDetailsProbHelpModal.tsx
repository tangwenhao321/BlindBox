import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function BoxDetailsProbHelpModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildProbHelpStyles);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.helpMask}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
      >
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>{t("boxDetails.probHelpTitle")}</Text>
          <Text style={styles.helpDesc}>{t("boxDetails.probHelpDesc")}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

function buildProbHelpStyles(colors: ThemeColors) {
  return StyleSheet.create({
    helpMask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.xl },
    helpCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg },
    helpTitle: { fontWeight: "800", marginBottom: spacing.sm, color: colors.textPrimary },
    helpDesc: { color: colors.textSecondary, lineHeight: 20 },
  });
}
