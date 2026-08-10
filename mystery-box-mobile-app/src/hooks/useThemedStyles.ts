import { useMemo } from "react";
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import { useAppTheme } from "../context/ThemeContext";
import type { ThemeColors } from "../styles/themes";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/** Build StyleSheet from theme colors; re-creates when dark/light mode changes. */
export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
  deps: readonly unknown[] = [],
): T {
  const { colors } = useAppTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, ...deps]);
}
