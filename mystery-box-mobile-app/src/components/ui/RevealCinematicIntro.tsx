import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { isUltimateCeremony, normalizeCeremonyTier } from "../../effects/ceremonyTier";
import { getLustrePalette, lustreGradientStops } from "../../effects/lustrePalette";
import { OptionalLottieBurst } from "./OptionalLottieBurst";
import type { PrizeTier } from "../../effects/config";

const { width: W, height: H } = Dimensions.get("window");

type Props = {
  visible: boolean;
  tier: string;
  accent: string;
  reduceMotion?: boolean;
};

/** 顶档传说揭晓前的 cinematic 琉光扫过 */
export function RevealCinematicIntro({ visible, tier, reduceMotion = false }: Props) {
  const sweep = useSharedValue(0);
  const veil = useSharedValue(1);
  const effectTier = normalizeCeremonyTier(tier);
  const lustre = getLustrePalette(effectTier);
  const show = visible && isUltimateCeremony(effectTier) && !reduceMotion;

  useEffect(() => {
    if (!show) {
      cancelAnimation(sweep);
      cancelAnimation(veil);
      sweep.value = 0;
      veil.value = 1;
      return;
    }
    sweep.value = withSequence(
      withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) }),
      withDelay(120, withTiming(0, { duration: 0 })),
    );
    veil.value = withSequence(
      withTiming(0.92, { duration: 180 }),
      withDelay(520, withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) })),
    );
    return () => {
      cancelAnimation(sweep);
      cancelAnimation(veil);
    };
  }, [show, sweep, veil]);

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.2, 1], [0, 0.9, 0]),
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-W * 0.6, W * 0.6]) },
      { rotate: "-18deg" },
      { scale: 1.8 },
    ],
  }));

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));

  if (!show) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.veil, veilStyle]}>
        <LinearGradient colors={lustreGradientStops(lustre.vignette)} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={lustreGradientStops([...lustre.aurora.slice(0, 3), "transparent"])} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} />
      </Animated.View>
      <Animated.View style={[styles.sweep, sweepStyle]}>
        <LinearGradient
          colors={lustreGradientStops(lustre.sheen)}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.sweepGrad}
        />
      </Animated.View>
      <OptionalLottieBurst tier={tier as PrizeTier} visible={show} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
  },
  sweep: {
    position: "absolute",
    width: W * 0.35,
    height: H * 1.2,
    top: -H * 0.1,
  },
  sweepGrad: {
    flex: 1,
  },
});
