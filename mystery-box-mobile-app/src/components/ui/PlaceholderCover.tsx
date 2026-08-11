import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../../context/ThemeContext";

type Props = {
  style?: StyleProp<ViewStyle>;
};

/** Offline brand placeholder: ink → brass (themed day/night), no network. */
export function PlaceholderCover({ style }: Props) {
  const { colors } = useAppTheme();

  return (
    <LinearGradient
      colors={[colors.bgPage, colors.brandDark, colors.brand]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.fill, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
