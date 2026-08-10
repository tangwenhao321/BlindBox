import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

type Props = {
  visible: boolean;
  collected: number;
  totalInSeries?: number;
};

export function RevealCollectionHint({ visible, collected, totalInSeries }: Props) {
  const { t } = useTranslation();
  if (!visible || collected <= 0) return null;
  return (
    <View style={styles.host} pointerEvents="none">
      <Text style={styles.text}>
        {totalInSeries
          ? t("revealOverlay.collectionProgress", { collected, total: totalInSeries })
          : t("revealOverlay.collectionProgressOpen", { collected })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    bottom: 120,
    right: 16,
    zIndex: 2180,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  text: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700" },
});
