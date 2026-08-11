import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";

/** Thin brass shelf lip under sub-page headers. */
export function SubPageShelfAccent() {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.lip,
        {
          backgroundColor: colors.shelfLip,
          borderTopColor: colors.brandDark,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  lip: {
    height: 8,
    borderTopWidth: 2,
  },
});
