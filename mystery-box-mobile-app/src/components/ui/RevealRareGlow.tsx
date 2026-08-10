import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LustreGradientRing } from "./RevealLustreLayers";

type Props = {
  cardSize: number;
  enabled: boolean;
  lustreRim?: readonly string[];
  reduceMotion?: boolean;
  breathPeriodMs?: number;
};

/** 稀有款琉光呼吸环（多色渐变 rim + 脉冲） */
export function RevealRareGlow({ cardSize, enabled, lustreRim, reduceMotion = false, breathPeriodMs = 900 }: Props) {
  const pulse = useSharedValue(0);
  const ringSize = cardSize + 40;
  const colors = lustreRim && lustreRim.length > 0 ? lustreRim : ["#fcd34d", "#f0abfc", "#67e8f9", "#fda4af"];

  useEffect(() => {
    if (!enabled || reduceMotion) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: breathPeriodMs, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [enabled, reduceMotion, pulse, breathPeriodMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
    transform: [{ scale: 0.94 + pulse.value * 0.14 }],
  }));

  if (!enabled) return null;

  return (
    <Animated.View style={[styles.host, animatedStyle]} pointerEvents="none">
      <LustreGradientRing size={ringSize} colors={colors} borderWidth={3} innerOpacity={0.88} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
