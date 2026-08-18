import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { RevealStoryboardId } from "../../effects/revealStoryboard";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";

/**
 * RN Animated cinematic grade for Honor / Expo Go (no Reanimated worklets).
 * Same Kenney CC0 sprites as {@link CinematicRevealLayer}.
 */
const SPRITES = {
  star: require("../../assets/effects/particles/star_08.png"),
  spark: require("../../assets/effects/particles/spark_05.png"),
  glow: require("../../assets/effects/particles/circle_05.png"),
  magic: require("../../assets/effects/particles/magic_05.png"),
  flare: require("../../assets/effects/particles/flare_01.png"),
  anamorphic: require("../../assets/effects/particles/window_04.png"),
  godray: require("../../assets/effects/particles/light_02.png"),
  godrayWarm: require("../../assets/effects/particles/light_01.png"),
  haze: require("../../assets/effects/particles/smoke_08.png"),
} as const;

type SpriteKey = keyof typeof SPRITES;

type Spec = {
  key: string;
  sprite: SpriteKey;
  tint: string;
  left: `${number}%` | number;
  top: `${number}%` | number;
  width: number | `${number}%`;
  height: number | `${number}%`;
  rotate?: number;
  opacity?: number;
};

type Props = {
  storyboard: RevealStoryboardId;
  reduceMotion?: boolean;
};

export function CinematicRevealLayerLite({ storyboard, reduceMotion = false }: Props) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  const specs = specsFor(storyboard);
  const grade = gradeFor(storyboard);
  const opacity = pulse.interpolate({ inputRange: [0.35, 1], outputRange: [0.55, 1] });
  const scale = pulse.interpolate({ inputRange: [0.35, 1], outputRange: [0.96, 1.06] });

  return (
    <View style={styles.host} pointerEvents="none">
      <LinearGradient colors={grade} style={StyleSheet.absoluteFill} />
      {reduceMotion
        ? null
        : specs.map((spec) => (
            <Animated.View
              key={spec.key}
              style={[
                {
                  position: "absolute",
                  left: spec.left,
                  top: spec.top,
                  width: spec.width,
                  height: spec.height,
                  opacity,
                  transform: [{ scale }, { rotate: `${spec.rotate ?? 0}deg` }],
                },
              ]}
            >
              <Image
                source={SPRITES[spec.sprite]}
                tintColor={spec.tint}
                resizeMode="contain"
                style={[StyleSheet.absoluteFill, { opacity: spec.opacity ?? 0.7 }]}
              />
            </Animated.View>
          ))}
      <LinearGradient colors={["rgba(0,0,0,0.9)", "transparent"]} style={styles.letterTop} />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.9)"]} style={styles.letterBottom} />
    </View>
  );
}

function gradeFor(storyboard: RevealStoryboardId): [string, string, string] {
  if (storyboard === "adventure") return ["rgba(40,22,8,0.22)", "transparent", "rgba(12,6,2,0.46)"];
  if (storyboard === "cyberpunk") return ["rgba(0,30,50,0.26)", "transparent", "rgba(20,0,40,0.44)"];
  if (storyboard === "asmr") return ["rgba(50,30,20,0.16)", "transparent", "rgba(30,16,12,0.32)"];
  if (storyboard === "party") return ["rgba(40,0,40,0.24)", "transparent", "rgba(10,0,20,0.42)"];
  return ["rgba(20,14,8,0.16)", "transparent", "rgba(6,4,8,0.36)"];
}

function specsFor(storyboard: RevealStoryboardId): Spec[] {
  if (storyboard === "cyberpunk") {
    return [
      { key: "ray", sprite: "godray", tint: "#18FFFF", left: "-18%", top: "-18%", width: "136%", height: "58%", opacity: 0.38 },
      { key: "ana", sprite: "anamorphic", tint: "#5CFFF7", left: "-28%", top: "8%", width: "156%", height: 72, opacity: 0.45 },
      { key: "flare", sprite: "flare", tint: "#FF5AD5", left: "58%", top: "6%", width: 200, height: 200, opacity: 0.32 },
      { key: "spark", sprite: "spark", tint: "#18FFFF", left: "8%", top: "72%", width: 90, height: 90 },
      { key: "star", sprite: "star", tint: "#E0FFFF", left: "78%", top: "68%", width: 36, height: 36 },
    ];
  }
  if (storyboard === "asmr") {
    return [
      { key: "glow", sprite: "glow", tint: "#FFE0B2", left: "-6%", top: "-4%", width: "70%", height: "42%", opacity: 0.28 },
      { key: "ray", sprite: "godrayWarm", tint: "#FFE0B2", left: "-12%", top: "-12%", width: "124%", height: "48%", opacity: 0.3 },
      { key: "magic", sprite: "magic", tint: "#FFB7C5", left: "55%", top: "62%", width: 180, height: 180, opacity: 0.35 },
      { key: "star", sprite: "star", tint: "#FFF8E1", left: "10%", top: "70%", width: 44, height: 44 },
    ];
  }
  if (storyboard === "party") {
    return [
      { key: "ray", sprite: "godray", tint: "#FFE082", left: "-16%", top: "-16%", width: "132%", height: "52%", opacity: 0.36 },
      { key: "ana", sprite: "anamorphic", tint: "#FFE082", left: "-30%", top: "6%", width: "160%", height: 72, opacity: 0.48 },
      { key: "flare", sprite: "flare", tint: "#FF6AD5", left: "52%", top: "4%", width: 220, height: 220, opacity: 0.34 },
      { key: "star", sprite: "star", tint: "#FFFFFF", left: "12%", top: "74%", width: 48, height: 48 },
    ];
  }
  if (storyboard === "adventure") {
    return [
      { key: "ray", sprite: "godrayWarm", tint: "#F3D38A", left: "-18%", top: "-14%", width: "136%", height: "56%", opacity: 0.4 },
      { key: "haze", sprite: "haze", tint: "#C9A36A", left: "-10%", top: "62%", width: "120%", height: "42%", opacity: 0.22 },
      { key: "ana", sprite: "anamorphic", tint: "#FFE082", left: "-28%", top: "8%", width: "156%", height: 72, opacity: 0.45 },
      { key: "magic", sprite: "magic", tint: "#F0D78A", left: "58%", top: "64%", width: 170, height: 170, opacity: 0.38 },
    ];
  }
  return [
    { key: "ray", sprite: "godrayWarm", tint: "#E8C9A0", left: "-16%", top: "-14%", width: "132%", height: "54%", opacity: 0.36 },
    { key: "ana", sprite: "anamorphic", tint: "#F5E6C8", left: "-26%", top: "8%", width: "152%", height: 70, opacity: 0.42 },
    { key: "star", sprite: "star", tint: "#FFF8E1", left: "12%", top: "72%", width: 46, height: 46 },
  ];
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: revealLayerZIndex.backdrop + 20,
    overflow: "hidden",
  },
  letterTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "11%",
  },
  letterBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "13%",
  },
});
