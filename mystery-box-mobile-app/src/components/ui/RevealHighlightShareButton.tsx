import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  onPress?: () => void;
  disabled?: boolean;
};

export function RevealHighlightShareButton({ onPress, disabled }: Props) {
  const { t } = useTranslation();

  if (!onPress) return null;

  return (
    <Pressable
      style={[styles.btn, disabled ? styles.btnDisabled : null]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t("revealOverlay.saveHighlightA11y")}
    >
      <Text style={styles.text}>{t("revealOverlay.saveHighlight")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  btnDisabled: { opacity: 0.45 },
  text: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
