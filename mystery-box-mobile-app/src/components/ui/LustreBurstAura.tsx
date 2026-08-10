import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { isPremiumCeremony, normalizeCeremonyTier } from "../../effects/ceremonyTier";
import { getLustrePalette, lustreGradientStops } from "../../effects/lustrePalette";

type Props = {
  tier: string;
  visible: boolean;
  reduceMotion?: boolean;
  size?: number;
  colors?: readonly string[];
};

/** 传说档 Lottie 背后的旋转琉光光环 */
export function LustreBurstAura({ tier, visible, reduceMotion = false, size = 320, colors }: Props) {
  const effectTier = normalizeCeremonyTier(tier);
  const palette = getLustrePalette(effectTier);
  const rim = colors ?? palette.rim;
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const show = visible && isPremiumCeremony(effectTier) && !reduceMotion;

  useEffect(() => {
    if (!show) {
      cancelAnimation(spin);
      cancelAnimation(pulse);
      spin.value = 0;
      pulse.value = 0;
      return;
    }
    spin.value = withRepeat(
      withTiming(1, { duration: 7200, easing: Easing.linear }),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0.4, { duration: 900 })),
      -1,
      false,
    );
    return () => {
      cancelAnimation(spin);
      cancelAnimation(pulse);
    };
  }, [show, spin, pulse]);

  const outerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.42, 0.78]),
    transform: [
      { rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg` },
      { scale: interpolate(pulse.value, [0, 1], [0.94, 1.08]) },
    ],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.28, 0.55]),
    transform: [
      { rotate: `${interpolate(spin.value, [0, 1], [360, 0])}deg` },
      { scale: interpolate(pulse.value, [0, 1], [1.06, 0.92]) },
    ],
  }));

  if (!show) return null;

  const outerSize = size * 1.12;
  const innerSize = size * 0.72;

  return (
    <View style={[styles.host, { width: size, height: size }]} pointerEvents="none">
      <Animated.View style={[styles.disc, { width: outerSize, height: outerSize, borderRadius: outerSize / 2 }, outerStyle]}>
        <LinearGradient
          colors={lustreGradientStops(rim)}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      <Animated.View style={[styles.disc, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }, innerStyle]}>
        <LinearGradient
          colors={lustreGradientStops(palette.auroraSecondary)}
          style={StyleSheet.absoluteFill}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  disc: {
    position: "absolute",
    overflow: "hidden",
  },
});
