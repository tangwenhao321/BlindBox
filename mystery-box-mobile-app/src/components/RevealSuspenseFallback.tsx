import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAppTheme } from "../context/ThemeContext";

/** Centered spinner for Suspense while prize-reveal chunks load (avoids blank flash). */
export function RevealSuspenseFallback() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.bgPage }]}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
});
