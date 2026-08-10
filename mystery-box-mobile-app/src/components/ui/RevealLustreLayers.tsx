import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
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
import { getLustrePalette, lustreGradientStops, type LustrePalette } from "../../effects/lustrePalette";

const { width: W, height: H } = Dimensions.get("window");

type Props = {
  visible: boolean;
  tier: string;
  reduceMotion?: boolean;
  /** 0 普通 — 1 顶档，控制琉光强度 */
  intensity?: number;
  palette?: LustrePalette;
};

/** 琉光背景：渐变 vignette + 双 aurora  orb + 扫光 sheen */
export function RevealLustreLayers({ visible, tier, reduceMotion = false, intensity = 0.6, palette: paletteOverride }: Props) {
  const effectTier = normalizeCeremonyTier(tier);
  const palette = paletteOverride ?? getLustrePalette(effectTier);
  const premium = isPremiumCeremony(effectTier);
  const strength = Math.min(1, intensity + (premium ? 0.25 : 0));
  const auroraA = useSharedValue(0);
  const auroraB = useSharedValue(0);
  const sheen = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!visible || reduceMotion) {
      cancelAnimation(auroraA);
      cancelAnimation(auroraB);
      cancelAnimation(sheen);
      cancelAnimation(pulse);
      return;
    }
    auroraA.value = withRepeat(
      withTiming(1, { duration: premium ? 14000 : 18000, easing: Easing.linear }),
      -1,
      false,
    );
    auroraB.value = withRepeat(
      withTiming(1, { duration: premium ? 19000 : 22000, easing: Easing.linear }),
      -1,
      false,
    );
    sheen.value = withRepeat(
      withSequence(
        withTiming(1, { duration: premium ? 2400 : 3200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: premium ? 1800 : 2400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.35, { duration: 900 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(auroraA);
      cancelAnimation(auroraB);
      cancelAnimation(sheen);
      cancelAnimation(pulse);
    };
  }, [visible, reduceMotion, premium, auroraA, auroraB, sheen, pulse]);

  const orbAStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.22 * strength, 0.48 * strength]),
    transform: [
      { rotate: `${interpolate(auroraA.value, [0, 1], [0, 360])}deg` },
      { scale: interpolate(pulse.value, [0, 1], [0.92, 1.08]) },
    ],
  }));

  const orbBStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.16 * strength, 0.38 * strength]),
    transform: [
      { rotate: `${interpolate(auroraB.value, [0, 1], [360, 0])}deg` },
      { scale: interpolate(pulse.value, [0, 1], [1.05, 0.9]) },
    ],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.35, 0.65, 1], [0, 0.55 * strength, 0.42 * strength, 0]),
    transform: [
      { translateX: interpolate(sheen.value, [0, 1], [-W * 0.55, W * 0.55]) },
      { rotate: "-16deg" },
      { scaleY: 1.6 },
    ],
  }));

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <LinearGradient colors={lustreGradientStops(palette.vignette)} style={StyleSheet.absoluteFill} />

      {!reduceMotion ? (
        <>
          <Animated.View style={[styles.orbHost, orbAStyle]}>
            <LinearGradient colors={lustreGradientStops(palette.aurora)} style={styles.orb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          </Animated.View>
          <Animated.View style={[styles.orbHostB, orbBStyle]}>
            <LinearGradient
              colors={lustreGradientStops(palette.auroraSecondary)}
              style={styles.orbSmall}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </Animated.View>
          <Animated.View style={[styles.sheen, sheenStyle]}>
            <LinearGradient colors={lustreGradientStops(palette.sheen)} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.sheenFill} />
          </Animated.View>
        </>
      ) : null}

      <LinearGradient colors={lustreGradientStops(palette.hGlow)} style={styles.hGlow} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
      <LinearGradient colors={lustreGradientStops(palette.vGlow)} style={styles.vGlow} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
    </View>
  );
}

type RingProps = {
  size: number;
  colors: readonly string[];
  borderWidth?: number;
  innerOpacity?: number;
  style?: object;
};

/** 渐变描边环（蓄力 / 琉光 rim） */
export function LustreGradientRing({
  size,
  colors,
  borderWidth = 2.5,
  innerOpacity = 0.72,
  style,
}: RingProps) {
  const inner = size - borderWidth * 2;
  const stops = lustreGradientStops(colors.length > 0 ? [...colors, colors[0] ?? "#ffffff"] : ["#ffffff", "#ffffff"]);
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }, style]}>
      <LinearGradient colors={stops} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View
        style={{
          position: "absolute",
          top: borderWidth,
          left: borderWidth,
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: `rgba(0,0,0,${innerOpacity})`,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  orbHost: {
    position: "absolute",
    top: H * 0.14,
    left: W * 0.08,
    width: W * 0.84,
    height: W * 0.84,
    alignItems: "center",
    justifyContent: "center",
  },
  orbHostB: {
    position: "absolute",
    top: H * 0.28,
    right: -W * 0.08,
    width: W * 0.62,
    height: W * 0.62,
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    width: "100%",
    height: "100%",
    borderRadius: W * 0.42,
  },
  orbSmall: {
    width: "100%",
    height: "100%",
    borderRadius: W * 0.31,
  },
  sheen: {
    position: "absolute",
    top: H * 0.22,
    width: W * 0.42,
    height: H * 0.55,
  },
  sheenFill: { flex: 1 },
  hGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "36%",
    height: 140,
    opacity: 0.9,
  },
  vGlow: {
    position: "absolute",
    top: "18%",
    bottom: "18%",
    left: "22%",
    width: "56%",
    opacity: 0.75,
  },
});
