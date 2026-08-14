import { Modal, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import type { ProductStory } from "../../effects/revealProductStory";

type Props = {
  visible: boolean;
  story: ProductStory | null;
  onClose: () => void;
};

export function ProductStorySheet({ visible, story, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  if (!visible || !story) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <Pressable style={[styles.sheet, { backgroundColor: colors.bgCard }]} onPress={() => undefined}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {story.title || t("revealOverlay.productStoryTitle")}
          </Text>
          <ScrollView style={styles.bodyScroll}>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{story.body}</Text>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.bgSoft }]}
          >
            <Text style={[styles.closeText, { color: colors.textPrimary }]}>
              {t("common.close")}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "62%",
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  bodyScroll: { maxHeight: 280 },
  body: { fontSize: 15, lineHeight: 22 },
  closeBtn: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeText: { fontWeight: "600" },
});
