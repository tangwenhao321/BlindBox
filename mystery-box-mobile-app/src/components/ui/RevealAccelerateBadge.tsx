import { StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  label?: "1.5x" | "2.5x" | null;
};

export function RevealAccelerateBadge({ visible, label }: Props) {
  if (!visible || !label) return null;
  return (
    <View style={styles.host} pointerEvents="none">
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 52,
    right: 18,
    zIndex: 2195,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,214,120,0.45)",
  },
  text: {
    color: "#FFD678",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
