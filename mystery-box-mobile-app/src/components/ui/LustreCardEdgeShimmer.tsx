import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { lustreGradientStops } from "../../effects/lustrePalette";

type Props = {
  width: number;
  height?: number;
  borderRadius: number;
  colors: readonly string[];
  borderWidth?: number;
  reduceMotion?: boolean;
  visible?: boolean;
  breathPeriodMs?: number;
  innerBackground?: string;
  children: ReactNode;
};

/** 卡面渐变描边 + 边缘扫光，增强琉光质感 */
export function LustreCardEdgeShimmer({
  width,
  height,
  borderRadius,
  colors,
  borderWidth = 2.5,
  reduceMotion = false,
  visible = true,
  breathPeriodMs = 2600,
  innerBackground = "transparent",
  children,
}: Props) {
  const sweep = useSharedValue(0);
  const innerRadius = Math.max(0, borderRadius - borderWidth);
  const rimStops = lustreGradientStops(colors.length > 0 ? [...colors, colors[0] ?? "#ffffff"] : ["#ffffff", "#e0e7ff"]);

  useEffect(() => {
    if (!visible || reduceMotion) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }
    sweep.value = withRepeat(
      withTiming(1, { duration: breathPeriodMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(sweep);
  }, [visible, reduceMotion, sweep, breathPeriodMs]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.12, 0.5, 0.88, 1], [0, 0.75, 1, 0.75, 0]),
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-width * 0.65, width * 0.85]) },
      { rotate: "-18deg" },
    ],
  }));

  return (
    <View style={{ width, borderRadius, overflow: "hidden", ...(height != null ? { height } : null) }}>
      <LinearGradient colors={rimStops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {!reduceMotion && visible ? (
        <Animated.View style={[styles.sheenHost, height != null ? { width, height } : styles.sheenHostFill, sheenStyle]} pointerEvents="none">
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.55)", "rgba(255,255,255,0.95)", "rgba(255,255,255,0.45)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.sheenBar}
          />
        </Animated.View>
      ) : null}
      <View
        style={{
          margin: borderWidth,
          borderRadius: innerRadius,
          overflow: "hidden",
          backgroundColor: innerBackground,
        }}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheenHost: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
  },
  sheenHostFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheenBar: {
    width: "38%",
    height: "100%",
  },
});
