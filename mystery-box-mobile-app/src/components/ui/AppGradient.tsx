import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  colors: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function AppGradient({ colors, start = { x: 0, y: 0 }, end = { x: 1, y: 1 }, style, children }: Props) {
  return (
    <LinearGradient colors={colors} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
}

export function GradientBorderCard({
  gradientColors,
  style,
  innerStyle,
  children,
}: {
  gradientColors: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.borderWrap, style]}>
      <View style={[styles.borderInner, innerStyle]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  borderWrap: { borderRadius: 18, padding: 1.5 },
  borderInner: { borderRadius: 16.5, backgroundColor: "#FFFFFF", overflow: "hidden" },
});
