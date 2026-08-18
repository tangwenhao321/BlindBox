import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { RevealStoryboardId } from "../../effects/revealStoryboard";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const SPRITES = {
  star: require("../../assets/effects/particles/star_08.png"),
  starBig: require("../../assets/effects/particles/star_09.png"),
  spark: require("../../assets/effects/particles/spark_05.png"),
  sparkAlt: require("../../assets/effects/particles/spark_06.png"),
  glow: require("../../assets/effects/particles/circle_05.png"),
  bloom: require("../../assets/effects/particles/circle_01.png"),
  magic: require("../../assets/effects/particles/magic_05.png"),
  magicSoft: require("../../assets/effects/particles/magic_04.png"),
  flare: require("../../assets/effects/particles/flare_01.png"),
  anamorphic: require("../../assets/effects/particles/window_04.png"),
  anamorphicSoft: require("../../assets/effects/particles/window_02.png"),
  godray: require("../../assets/effects/particles/light_02.png"),
  godrayWarm: require("../../assets/effects/particles/light_01.png"),
  haze: require("../../assets/effects/particles/smoke_08.png"),
  twirl: require("../../assets/effects/particles/twirl_03.png"),
  ember: require("../../assets/effects/particles/flame_02.png"),
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
  pulse?: boolean;
  drift?: boolean;
};

type Props = {
  storyboard: RevealStoryboardId;
  reduceMotion?: boolean;
  letterbox?: boolean;
};

/** Kenney CC0 VFX sprites: anamorphic flare, god rays, sparkles — cinematic grade. */
export function CinematicRevealLayer({ storyboard, reduceMotion = false, letterbox = true }: Props) {
  const pulse = useSharedValue(0.45);
  const drift = useSharedValue(0);
  const zoom = useSharedValue(0);

  if (reduceMotion) {
    return letterbox ? <Letterbox /> : null;
  }

  return (
    <CinematicMotion
      storyboard={storyboard}
      letterbox={letterbox}
      pulse={pulse}
      drift={drift}
      zoom={zoom}
    />
  );
}

function CinematicMotion({
  storyboard,
  letterbox,
  pulse,
  drift,
  zoom,
}: {
  storyboard: RevealStoryboardId;
  letterbox: boolean;
  pulse: SharedValue<number>;
  drift: SharedValue<number>;
  zoom: SharedValue<number>;
}) {
  const specs = specsFor(storyboard);
  const grade = gradeFor(storyboard);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.32, { duration: 1500 }),
      ),
      -1,
      false,
    );
    drift.value = withRepeat(withTiming(1, { duration: 9800, easing: Easing.inOut(Easing.sin) }), -1, true);
    zoom.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4200, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 4200, easing: Easing.in(Easing.cubic) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(drift);
      cancelAnimation(zoom);
    };
  }, [drift, pulse, zoom]);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(zoom.value, [0, 1], [1, 1.08]) }],
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, stageStyle]}>
        <LinearGradient colors={grade} style={styles.grade} />
        {specs.map((spec) => (
          <CinematicSprite key={spec.key} spec={spec} pulse={pulse} drift={drift} />
        ))}
      </Animated.View>
      {letterbox ? <Letterbox /> : null}
    </View>
  );
}

function CinematicSprite({
  spec,
  pulse,
  drift,
}: {
  spec: Spec;
  pulse: SharedValue<number>;
  drift: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const breathe = spec.pulse ? interpolate(pulse.value, [0, 1], [0.42, 1]) : 1;
    const lift = spec.drift ? interpolate(drift.value, [0, 1], [-14, 16]) : 0;
    const scale = spec.pulse ? interpolate(pulse.value, [0, 1], [0.9, 1.12]) : 1;
    return {
      opacity: (spec.opacity ?? 0.72) * breathe,
      transform: [{ translateY: lift }, { rotate: `${spec.rotate ?? 0}deg` }, { scale }],
    };
  });

  return (
    <AnimatedImage
      source={SPRITES[spec.sprite]}
      tintColor={spec.tint}
      resizeMode="contain"
      style={[
        {
          position: "absolute",
          left: spec.left,
          top: spec.top,
          width: spec.width,
          height: spec.height,
        },
        style,
      ]}
    />
  );
}

function Letterbox() {
  return (
    <>
      <LinearGradient colors={["rgba(0,0,0,0.92)", "transparent"]} style={styles.letterTop} />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.92)"]} style={styles.letterBottom} />
    </>
  );
}

function gradeFor(storyboard: RevealStoryboardId): [string, string, string] {
  if (storyboard === "adventure") return ["rgba(40,22,8,0.10)", "transparent", "rgba(12,6,2,0.22)"];
  if (storyboard === "cyberpunk") return ["rgba(0,30,50,0.12)", "transparent", "rgba(20,0,40,0.22)"];
  if (storyboard === "asmr") return ["rgba(50,30,20,0.08)", "transparent", "rgba(30,16,12,0.16)"];
  if (storyboard === "party") return ["rgba(40,0,40,0.10)", "transparent", "rgba(10,0,20,0.20)"];
  return ["rgba(20,14,8,0.08)", "transparent", "rgba(6,4,8,0.18)"];
}

function specsFor(storyboard: RevealStoryboardId): Spec[] {
  if (storyboard === "adventure") {
    return [
      { key: "ray", sprite: "godrayWarm", tint: "#F3D38A", left: "-18%", top: "-16%", width: "136%", height: "52%", opacity: 0.4, pulse: true },
      { key: "haze", sprite: "haze", tint: "#C9A36A", left: "-10%", top: "64%", width: "120%", height: "40%", opacity: 0.22, drift: true },
      { key: "ana", sprite: "anamorphic", tint: "#FFE082", left: "-28%", top: "8%", width: "156%", height: 72, opacity: 0.48, pulse: true },
      { key: "flare", sprite: "flare", tint: "#FFB74D", left: "58%", top: "4%", width: 200, height: 200, rotate: -18, opacity: 0.38, pulse: true },
      { key: "magic", sprite: "magic", tint: "#F0D78A", left: "8%", top: "68%", width: 160, height: 160, opacity: 0.4, pulse: true },
      { key: "ember", sprite: "ember", tint: "#FF9A3C", left: "72%", top: "62%", width: 100, height: 140, opacity: 0.32, drift: true },
      { key: "s1", sprite: "starBig", tint: "#FFF3C4", left: "10%", top: "10%", width: 48, height: 48, pulse: true },
      { key: "s2", sprite: "star", tint: "#FFE082", left: "78%", top: "14%", width: 32, height: 32, pulse: true, drift: true },
      { key: "s3", sprite: "spark", tint: "#FFCC80", left: "14%", top: "74%", width: 56, height: 56, opacity: 0.4, pulse: true },
      { key: "s4", sprite: "star", tint: "#FFF8E1", left: "70%", top: "72%", width: 26, height: 26, drift: true },
    ];
  }
  if (storyboard === "cyberpunk") {
    return [
      { key: "ray", sprite: "godray", tint: "#18FFFF", left: "-20%", top: "-16%", width: "140%", height: "52%", opacity: 0.34, pulse: true },
      { key: "anaC", sprite: "anamorphic", tint: "#5CFFF7", left: "-30%", top: "6%", width: "160%", height: 68, opacity: 0.45, pulse: true },
      { key: "anaM", sprite: "anamorphicSoft", tint: "#FF5AD5", left: "-18%", top: "72%", width: "136%", height: 56, rotate: 8, opacity: 0.32, pulse: true },
      { key: "twirl", sprite: "twirl", tint: "#EA80FC", left: "58%", top: "4%", width: 180, height: 180, opacity: 0.28, pulse: true },
      { key: "spark", sprite: "spark", tint: "#18FFFF", left: "8%", top: "12%", width: 72, height: 72, pulse: true },
      { key: "spark2", sprite: "sparkAlt", tint: "#FF5AD5", left: "72%", top: "66%", width: 70, height: 70, pulse: true, drift: true },
      { key: "glow", sprite: "glow", tint: "#4DA6FF", left: "62%", top: "68%", width: 160, height: 160, opacity: 0.28, pulse: true },
      { key: "s1", sprite: "star", tint: "#E0FFFF", left: "8%", top: "10%", width: 28, height: 28, pulse: true },
      { key: "s2", sprite: "starBig", tint: "#FF80AB", left: "80%", top: "12%", width: 40, height: 40, drift: true },
      { key: "s3", sprite: "star", tint: "#18FFFF", left: "16%", top: "76%", width: 24, height: 24, pulse: true },
    ];
  }
  if (storyboard === "asmr") {
    return [
      { key: "bloom", sprite: "bloom", tint: "#FFE0B2", left: "-4%", top: "-8%", width: "70%", height: "42%", opacity: 0.28, pulse: true },
      { key: "ray", sprite: "godrayWarm", tint: "#FFE0B2", left: "-12%", top: "-14%", width: "124%", height: "48%", opacity: 0.28, pulse: true },
      { key: "ana", sprite: "anamorphicSoft", tint: "#FFD7BA", left: "-22%", top: "8%", width: "144%", height: 58, opacity: 0.34, pulse: true },
      { key: "magic", sprite: "magicSoft", tint: "#FFB7C5", left: "56%", top: "64%", width: 170, height: 170, opacity: 0.36, pulse: true },
      { key: "haze", sprite: "haze", tint: "#FFF3E0", left: "-8%", top: "66%", width: "116%", height: "36%", opacity: 0.18, drift: true },
      { key: "s1", sprite: "starBig", tint: "#FFF8E1", left: "10%", top: "12%", width: 42, height: 42, pulse: true, drift: true },
      { key: "s2", sprite: "star", tint: "#FFCDD2", left: "78%", top: "14%", width: 30, height: 30, pulse: true },
      { key: "s3", sprite: "sparkAlt", tint: "#F8BBD0", left: "12%", top: "72%", width: 52, height: 52, opacity: 0.36, drift: true },
      { key: "s4", sprite: "star", tint: "#FFE0B2", left: "74%", top: "74%", width: 22, height: 22, pulse: true },
    ];
  }
  if (storyboard === "party") {
    return [
      { key: "ray", sprite: "godray", tint: "#FFE082", left: "-16%", top: "-16%", width: "132%", height: "50%", opacity: 0.36, pulse: true },
      { key: "ana", sprite: "anamorphic", tint: "#FFE082", left: "-32%", top: "6%", width: "164%", height: 72, opacity: 0.48, pulse: true },
      { key: "flare", sprite: "flare", tint: "#FF6AD5", left: "56%", top: "2%", width: 220, height: 220, rotate: -12, opacity: 0.34, pulse: true },
      { key: "flare2", sprite: "flare", tint: "#69F0FF", left: "-8%", top: "64%", width: 200, height: 200, rotate: 16, opacity: 0.3, pulse: true },
      { key: "magic", sprite: "magic", tint: "#FFD54F", left: "62%", top: "66%", width: 160, height: 160, opacity: 0.38, pulse: true },
      { key: "spark", sprite: "spark", tint: "#FF80AB", left: "8%", top: "70%", width: 72, height: 72, pulse: true, drift: true },
      { key: "spark2", sprite: "sparkAlt", tint: "#82B1FF", left: "78%", top: "12%", width: 72, height: 72, pulse: true },
      { key: "s1", sprite: "starBig", tint: "#FFFFFF", left: "12%", top: "10%", width: 46, height: 46, pulse: true },
      { key: "s2", sprite: "star", tint: "#EA80FC", left: "80%", top: "14%", width: 34, height: 34, drift: true },
      { key: "s3", sprite: "star", tint: "#FFE082", left: "18%", top: "76%", width: 28, height: 28, pulse: true },
    ];
  }
  return [
    { key: "ray", sprite: "godrayWarm", tint: "#E8C9A0", left: "-16%", top: "-14%", width: "132%", height: "52%", opacity: 0.36, pulse: true },
    { key: "ana", sprite: "anamorphic", tint: "#F5E6C8", left: "-26%", top: "8%", width: "152%", height: 68, opacity: 0.42, pulse: true },
    { key: "glow", sprite: "glow", tint: "#E0C48A", left: "58%", top: "64%", width: 180, height: 180, opacity: 0.28, pulse: true },
    { key: "magic", sprite: "magicSoft", tint: "#FFE082", left: "8%", top: "66%", width: 150, height: 150, opacity: 0.34, pulse: true },
    { key: "s1", sprite: "starBig", tint: "#FFF8E1", left: "12%", top: "12%", width: 42, height: 42, pulse: true },
    { key: "s2", sprite: "star", tint: "#E8C9A0", left: "78%", top: "14%", width: 28, height: 28, pulse: true, drift: true },
    { key: "s3", sprite: "spark", tint: "#FFE082", left: "16%", top: "74%", width: 52, height: 52, opacity: 0.36, pulse: true },
  ];
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    // Must stay under prize card (800) so VFX does not wash out the reveal.
    zIndex: revealLayerZIndex.backdrop + 20,
    overflow: "hidden",
  },
  grade: {
    ...StyleSheet.absoluteFillObject,
  },
  letterTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "11%",
    zIndex: revealLayerZIndex.backdrop + 30,
  },
  letterBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "13%",
    zIndex: revealLayerZIndex.backdrop + 30,
  },
});
