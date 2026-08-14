import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  onPress: () => void;
};

export function BoxDetailsWinFab({ onPress }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildWinFabStyles);

  return (
    <Pressable
      style={styles.winFab}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("boxDetails.winFab")}
    >
      <Ionicons name="trophy" size={18} color={styles.winFabText.color} />
      <Text style={styles.winFabText}>{t("boxDetails.winFab")}</Text>
    </Pressable>
  );
}

function buildWinFabStyles(colors: ThemeColors) {
  return StyleSheet.create({
    winFab: {
      position: "absolute",
      right: layout.screenPaddingX,
      bottom: 132,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.shadowInk,
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    winFabText: { fontSize: 9, color: colors.textSecondary, fontWeight: "700" },
  });
}
