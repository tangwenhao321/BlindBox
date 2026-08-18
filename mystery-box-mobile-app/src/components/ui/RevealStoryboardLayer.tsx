import { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  shouldPlayStoryboard,
  type RevealStoryboardId,
} from "../../effects/revealStoryboard";
import { resolveProductStory } from "../../effects/revealProductStory";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";
import { playStoryboardSting } from "../../effects/sound";

const { width: W, height: H } = Dimensions.get("window");

type Props = {
  visible: boolean;
  storyboard: RevealStoryboardId;
  cardFlip?: SharedValue<number>;
  flashOpacity: SharedValue<number>;
  prizeName?: string;
  prizeStoryTagline?: string;
  rarityRings?: number;
  reduceMotion?: boolean;
  degradeLevel?: number;
  density?: "full" | "lite";
  playStings?: boolean;
};

type BoardProps = {
  cardFlip?: SharedValue<number>;
  flashOpacity: SharedValue<number>;
  prizeName?: string;
  prizeStoryTagline?: string;
  rarityRings?: number;
  density?: "full" | "lite";
};

export function RevealStoryboardLayer({
  visible,
  storyboard,
  cardFlip,
  flashOpacity,
  prizeName,
  prizeStoryTagline,
  rarityRings = 1,
  reduceMotion = false,
  degradeLevel = 0,
  density = "full",
  playStings = true,
}: Props) {
  if (!visible || !shouldPlayStoryboard({ storyboard, reduceMotion, degradeLevel, density })) {
    return null;
  }
  const board =
    storyboard === "adventure" ? (
      <AdventureBoard
        cardFlip={cardFlip}
        flashOpacity={flashOpacity}
        prizeName={prizeName}
        prizeStoryTagline={prizeStoryTagline}
        density={density}
      />
    ) : storyboard === "cyberpunk" ? (
      <CyberpunkBoard cardFlip={cardFlip} flashOpacity={flashOpacity} rarityRings={rarityRings} density={density} />
    ) : storyboard === "asmr" ? (
      <AsmrBoard cardFlip={cardFlip} flashOpacity={flashOpacity} density={density} />
    ) : (
      <PartyBoard cardFlip={cardFlip} flashOpacity={flashOpacity} prizeName={prizeName} density={density} />
    );
  return (
    <>
      {playStings ? (
        <StoryboardStingSync storyboard={storyboard} flashOpacity={flashOpacity} density={density} />
      ) : null}
      {board}
    </>
  );
}

function StoryboardStingSync({
  storyboard,
  flashOpacity,
  density,
}: {
  storyboard: RevealStoryboardId;
  flashOpacity: SharedValue<number>;
  density: "full" | "lite";
}) {
  useEffect(() => {
    if (density === "full") playStoryboardSting(storyboard, "suspense");
  }, [storyboard, density]);

  useAnimatedReaction(
    () => flashOpacity.value,
    (v, prev) => {
      if (v > 0.42 && (prev ?? 0) <= 0.42) {
        runOnJS(playStoryboardSting)(storyboard, "open");
      }
    },
    [storyboard],
  );
  return null;
}

function AdventureBoard({ cardFlip, flashOpacity, prizeName, prizeStoryTagline, density = "full" }: BoardProps) {
  const needle = useSharedValue(0);
  const candles = useSharedValue(density === "lite" ? 0.55 : 0);
  useEffect(() => {
    if (density === "lite") {
      needle.value = 3.2;
      candles.value = 0.55;
      return;
    }
    needle.value = 0;
    needle.value = withSequence(
      withTiming(6.4, { duration: 920, easing: Easing.out(Easing.cubic) }),
      withTiming(6.55, { duration: 180 }),
    );
    candles.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420 }),
        withTiming(0.35, { duration: 380 }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(needle);
      cancelAnimation(candles);
    };
  }, [candles, density, needle]);

  const mapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.55, 1], [1, 0.55, 0.28]),
  }));
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(needle.value, [0, 6.55], [-40, 128])}deg` }],
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.5, 0.75], [1, 0.4, 0]),
  }));
  const slitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.4, 1], [0, 0.95, 0.15]),
    transform: [{ scaleY: interpolate(flashOpacity.value, [0, 1], [0.2, 1.6]) }],
  }));
  const fogStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.45, 0.75, 1], [0.55, 0.22, 0.06]),
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.62, 0.85, 1], [0, 1, 0.85]),
    transform: [{ scale: interpolate(cardFlip?.value ?? 0, [0.62, 1], [0.6, 1]) }],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.7, 0.92], [0, 1]),
  }));
  const candleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(candles.value, [0, 1], [0.25, 0.7]),
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, mapStyle]}>
        <LinearGradient
          colors={["#3a2a18", "#6b4a28", "#2a1c10"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mapGrid} />
      </Animated.View>
      <Animated.View style={[styles.candle, styles.candleL, candleStyle]} />
      <Animated.View style={[styles.candle, styles.candleR, candleStyle]} />
      <Animated.View style={[styles.compass, needleStyle]}>
        <View style={styles.compassRing} />
        <View style={styles.compassNeedle} />
      </Animated.View>
      <Animated.View style={[styles.goldSlit, slitStyle]} />
      <Animated.View style={[styles.fog, fogStyle]}>
        <LinearGradient colors={["transparent", "rgba(220,210,190,0.45)", "transparent"]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.treasureMark, markStyle]}>
        <Text style={styles.treasureX}>✕</Text>
      </Animated.View>
      <Animated.Text style={[styles.caption, captionStyle]}>
        {prizeStoryTagline || resolveProductStory(prizeName ?? "prize", prizeName).tagline}
      </Animated.Text>
    </View>
  );
}

function CyberpunkBoard({ cardFlip, flashOpacity, rarityRings = 1, density = "full" }: BoardProps) {
  const { t } = useTranslation();
  const rain = useSharedValue(0);
  const glitch = useSharedValue(0);
  useEffect(() => {
    if (density === "lite") {
      rain.value = 0.4;
      glitch.value = 0;
      return;
    }
    rain.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    glitch.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 520 }),
        withTiming(1, { duration: 70 }),
        withTiming(0, { duration: 90 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rain);
      cancelAnimation(glitch);
    };
  }, [density, glitch, rain]);

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.45, 0.7], [0.85, 0.4, 0]),
    transform: [{ scale: interpolate(cardFlip?.value ?? 0, [0, 0.55], [1, 1.18]) }],
  }));
  const rainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(rain.value, [0, 1], [-80, 80]) }],
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.6, 1], [0.55, 0.25, 0.12]),
  }));
  const rgbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.5, 1], [0, 0.7, 0.08]),
    transform: [{ translateX: interpolate(glitch.value, [0, 1], [0, 7]) }],
  }));
  const pixelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.5, 0.78, 1], [0.55, 0.18, 0]),
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.72, 0.92], [0, 1]),
  }));
  const rings = Math.max(1, Math.min(4, rarityRings));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.hologram, shieldStyle]}>
        <View style={styles.hologramRing} />
        <View style={[styles.hologramRing, styles.hologramRingInner]} />
      </Animated.View>
      <Animated.View style={[styles.dataRain, rainStyle]}>
        {Array.from({ length: density === "lite" ? 4 : 10 }).map((_, i) => (
          <View key={`col-${i}`} style={[styles.dataCol, { left: 8 + i * ((W - 16) / (density === "lite" ? 4 : 10)) }]} />
        ))}
      </Animated.View>
      <Animated.View style={[styles.rgbSplit, rgbStyle]}>
        <View style={styles.rgbRed} />
        <View style={styles.rgbCyan} />
      </Animated.View>
      <View style={styles.scanlines} />
      <Animated.View style={[styles.pixelGrid, pixelStyle]} />
      {Array.from({ length: rings }).map((_, i) => (
        <View
          key={`neon-${i}`}
          style={[
            styles.neonRing,
            { width: 140 + i * 36, height: 140 + i * 36, borderRadius: 70 + i * 18, opacity: 0.35 - i * 0.05 },
          ]}
        />
      ))}
      <Animated.Text style={[styles.cyberCaption, captionStyle]}>{t("revealOverlay.storyboardCyberCaption")}</Animated.Text>
    </View>
  );
}

function AsmrBoard({ cardFlip, flashOpacity, density = "full" }: BoardProps) {
  const { t } = useTranslation();
  const breath = useSharedValue(density === "lite" ? 0.5 : 0);
  useEffect(() => {
    if (density === "lite") {
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(breath);
  }, [breath, density]);

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.06]) }],
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.7, 1], [0.9, 0.45, 0.2]),
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.35, 1], [0, 0.85, 0.2]),
    transform: [{ scale: interpolate(flashOpacity.value, [0, 1], [0.35, 1.45]) }],
  }));
  const petalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.55, 0.85], [0, 0.9]),
    transform: [{ translateY: interpolate(cardFlip?.value ?? 0, [0.55, 1], [24, -12]) }],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.7, 0.92], [0, 1]),
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, cloudStyle]}>
        <LinearGradient colors={["#f3e6c8", "#e8d5b0", "#c9b48a"]} style={StyleSheet.absoluteFill} />
        <View style={styles.cloudA} />
        <View style={styles.cloudB} />
      </Animated.View>
      <LinearGradient
        colors={["rgba(255,244,210,0.35)", "transparent"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 0.7 }}
        style={styles.tyndall}
      />
      <Animated.View style={[styles.bloom, bloomStyle]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={`petal-${i}`} style={[styles.petal, { transform: [{ rotate: `${i * 60}deg` }] }]} />
        ))}
      </Animated.View>
      <Animated.View style={[styles.floatPetals, petalStyle]}>
        <View style={[styles.bubble, { left: "18%", top: "28%" }]} />
        <View style={[styles.bubble, styles.bubbleSm, { left: "72%", top: "34%" }]} />
        <View style={[styles.bubble, { left: "58%", top: "62%" }]} />
      </Animated.View>
      <Animated.Text style={[styles.asmrCaption, captionStyle]}>{t("revealOverlay.storyboardAsmrCaption")}</Animated.Text>
    </View>
  );
}

function PartyBoard({ cardFlip, flashOpacity, prizeName, density = "full" }: BoardProps) {
  const { t } = useTranslation();
  const beat = useSharedValue(density === "lite" ? 0.4 : 0);
  const marquee = useSharedValue(0);
  useEffect(() => {
    if (density === "lite") {
      beat.value = 0.4;
      marquee.value = 0.35;
      return;
    }
    beat.value = withRepeat(
      withSequence(withTiming(1, { duration: 180 }), withTiming(0.2, { duration: 220 })),
      -1,
      false,
    );
    marquee.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(beat);
      cancelAnimation(marquee);
    };
  }, [beat, density, marquee]);

  const discoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.55, 1], [0.9, 0.5, 0.35]),
    transform: [{ rotate: `${interpolate(beat.value, [0, 1], [0, 18])}deg` }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.45, 1], [0, 1, 0.12]),
    transform: [{ scale: interpolate(flashOpacity.value, [0, 1], [0.4, 1.8]) }],
  }));
  const stageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.55, 0.85], [0, 1]),
  }));
  const marqueeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(marquee.value, [0, 1], [W * 0.4, -W * 0.9]) }],
    opacity: interpolate(cardFlip?.value ?? 0, [0.65, 0.85], [0, 1]),
  }));
  const lightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0, 1], [0.2, 0.75]),
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.disco, discoStyle]} />
      <Animated.View style={[styles.spotA, lightStyle]} />
      <Animated.View style={[styles.spotB, lightStyle]} />
      <Animated.View style={[styles.burst, burstStyle]} />
      <Animated.View style={[styles.stage, stageStyle]}>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)", "rgba(40,10,50,0.85)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.crowd} />
      </Animated.View>
      <Animated.Text style={[styles.marquee, marqueeStyle]}>
        {t("revealOverlay.storyboardPartyMarquee", { name: prizeName || t("revealOverlay.feedTickerPrize") })}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: revealLayerZIndex.backdrop + 40,
    overflow: "hidden",
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 18,
    borderColor: "rgba(90,60,30,0.35)",
    opacity: 0.5,
  },
  candle: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,170,60,0.55)",
    bottom: H * 0.18,
  },
  candleL: { left: 28 },
  candleR: { right: 28 },
  compass: {
    position: "absolute",
    top: H * 0.22,
    alignSelf: "center",
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  compassRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "rgba(220,180,90,0.75)",
  },
  compassNeedle: {
    width: 6,
    height: 40,
    backgroundColor: "#E8C36A",
    borderRadius: 2,
  },
  goldSlit: {
    position: "absolute",
    alignSelf: "center",
    top: H * 0.28,
    width: 8,
    height: H * 0.42,
    backgroundColor: "rgba(255,220,120,0.85)",
    shadowColor: "#FFD54F",
    shadowOpacity: 0.9,
    shadowRadius: 18,
  },
  fog: {
    ...StyleSheet.absoluteFillObject,
  },
  treasureMark: {
    position: "absolute",
    bottom: H * 0.26,
    alignSelf: "center",
  },
  treasureX: {
    color: "rgba(180,40,40,0.85)",
    fontSize: 42,
    fontWeight: "900",
  },
  caption: {
    position: "absolute",
    bottom: 86,
    alignSelf: "center",
    color: "rgba(255,236,200,0.92)",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  hologram: {
    position: "absolute",
    alignSelf: "center",
    top: H * 0.28,
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  hologramRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "rgba(0,229,255,0.55)",
  },
  hologramRingInner: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderColor: "rgba(234,128,252,0.4)",
  },
  dataRain: {
    ...StyleSheet.absoluteFillObject,
  },
  dataCol: {
    position: "absolute",
    top: 0,
    width: 2,
    height: H,
    backgroundColor: "rgba(0,255,200,0.18)",
  },
  rgbSplit: {
    ...StyleSheet.absoluteFillObject,
  },
  rgbRed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,40,80,0.18)",
    transform: [{ translateX: -6 }],
  },
  rgbCyan: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,220,255,0.16)",
    transform: [{ translateX: 6 }],
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    opacity: 0.35,
  },
  pixelGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,20,40,0.25)",
  },
  neonRing: {
    position: "absolute",
    alignSelf: "center",
    top: H * 0.32,
    borderWidth: 2,
    borderColor: "rgba(0,229,255,0.45)",
  },
  cyberCaption: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    color: "#18FFFF",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "800",
  },
  cloudA: {
    position: "absolute",
    width: 180,
    height: 70,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.35)",
    top: H * 0.18,
    left: 24,
  },
  cloudB: {
    position: "absolute",
    width: 150,
    height: 58,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.28)",
    top: H * 0.22,
    right: 18,
  },
  tyndall: {
    position: "absolute",
    top: 0,
    left: W * 0.15,
    width: W * 0.7,
    height: H * 0.55,
  },
  bloom: {
    position: "absolute",
    alignSelf: "center",
    top: H * 0.3,
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  petal: {
    position: "absolute",
    width: 36,
    height: 70,
    borderRadius: 18,
    backgroundColor: "rgba(255,128,171,0.45)",
  },
  floatPetals: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,200,230,0.6)",
  },
  bubbleSm: { width: 14, height: 14, borderRadius: 7 },
  asmrCaption: {
    position: "absolute",
    bottom: 88,
    alignSelf: "center",
    color: "rgba(90,50,40,0.85)",
    fontSize: 13,
  },
  disco: {
    position: "absolute",
    alignSelf: "center",
    top: 36,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 4,
    borderColor: "rgba(255,213,79,0.8)",
  },
  spotA: {
    position: "absolute",
    width: 120,
    height: 220,
    top: 80,
    left: 20,
    backgroundColor: "rgba(255,80,180,0.22)",
    transform: [{ rotate: "-18deg" }],
  },
  spotB: {
    position: "absolute",
    width: 120,
    height: 220,
    top: 80,
    right: 20,
    backgroundColor: "rgba(80,180,255,0.22)",
    transform: [{ rotate: "18deg" }],
  },
  burst: {
    position: "absolute",
    alignSelf: "center",
    top: H * 0.28,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,230,120,0.55)",
  },
  stage: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: H * 0.28,
  },
  crowd: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  marquee: {
    position: "absolute",
    top: 18,
    color: "#FFE082",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
});
