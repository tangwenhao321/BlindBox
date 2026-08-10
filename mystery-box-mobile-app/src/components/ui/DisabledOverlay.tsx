import { StyleSheet, View, type ViewStyle } from "react-native";

type Props = {
  visible: boolean;
  style?: ViewStyle;
};

export function DisabledOverlay({ visible, style }: Props) {
  if (!visible) return null;
  return <View style={[styles.overlay, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 20,
  },
});
