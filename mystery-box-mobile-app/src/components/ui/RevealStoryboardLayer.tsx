import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
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
    if (density === "full") playStoryboardSting(storyboard, "suspense", { force: true });
  }, [storyboard, density]);

  useAnimatedReaction(
    () => flashOpacity.value,
    (v, prev) => {
      if (v > 0.42 && (prev ?? 0) <= 0.42) {
        runOnJS(playStoryboardSting)(storyboard, "open", { force: true });
      }
    },
    [storyboard],
  );
  return null;
}

function AdventureBoard({ cardFlip, flashOpacity, prizeName, prizeStoryTagline, density = "full" }: BoardProps) {
  const needle = useSharedValue(0);
  const candles = useSharedValue(density === "lite" ? 0.55 : 0);
  const drift = useSharedValue(0);
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
      withSequence(withTiming(1, { duration: 420 }), withTiming(0.35, { duration: 380 })),
      -1,
      true,
    );
    drift.value = withRepeat(withTiming(1, { duration: 6400, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(needle);
      cancelAnimation(candles);
      cancelAnimation(drift);
    };
  }, [candles, density, drift, needle]);

  const mapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.55, 1], [1, 0.62, 0.34]),
  }));
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(needle.value, [0, 6.55], [-40, 128])}deg` }],
  }));
  const slitStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.4, 1], [0, 0.95, 0.18]),
    transform: [{ scaleY: interpolate(flashOpacity.value, [0, 1], [0.2, 1.55]) }],
  }));
  const fogStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.45, 0.75, 1], [0.55, 0.22, 0.06]),
    transform: [{ translateX: interpolate(drift.value, [0, 1], [-18, 18]) }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.62, 0.85, 1], [0, 1, 0.85]),
    transform: [{ scale: interpolate(cardFlip?.value ?? 0, [0.62, 1], [0.6, 1.08]) }],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.7, 0.92], [0, 1]),
  }));
  const candleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(candles.value, [0, 1], [0.28, 0.92]),
    transform: [{ scale: interpolate(candles.value, [0, 1], [0.86, 1.18]) }],
  }));
  const sparkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(candles.value, [0, 1], [0.2, 0.8]),
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, mapStyle]}>
        <LinearGradient
          colors={["#2a1c10", "#6b4a28", "#1a1208"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mapGrid} />
        <View style={styles.mapTrail} />
        <View style={[styles.mapTrail, styles.mapTrailAlt]} />
      </Animated.View>
      <LinearGradient
        colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.55)"]}
        style={styles.vignette}
      />
      <Animated.View style={[styles.ember, styles.emberL, candleStyle]} />
      <Animated.View style={[styles.ember, styles.emberR, candleStyle]} />
      <Animated.View style={[styles.ember, styles.emberM, sparkStyle]} />
      <View style={styles.centerStage}>
        <View style={styles.compassHalo} />
        <Animated.View style={[styles.compass, needleStyle]}>
          <View style={styles.compassRing} />
          <View style={styles.compassRingInner} />
          <View style={styles.compassTickN} />
          <View style={styles.compassTickE} />
          <View style={styles.compassNeedle} />
          <View style={styles.compassHub} />
        </Animated.View>
        <Animated.View style={[styles.goldSlit, slitStyle]} />
        <Animated.View style={[styles.treasureMark, markStyle]}>
          <Text style={styles.treasureX}>✕</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.fog, fogStyle]}>
        <LinearGradient colors={["transparent", "rgba(220,210,190,0.42)", "transparent"]} style={StyleSheet.absoluteFill} />
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
  const scan = useSharedValue(0);
  useEffect(() => {
    if (density === "lite") {
      rain.value = 0.4;
      glitch.value = 0;
      return;
    }
    rain.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
    scan.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
    glitch.value = withRepeat(
      withSequence(withTiming(0, { duration: 520 }), withTiming(1, { duration: 70 }), withTiming(0, { duration: 90 })),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rain);
      cancelAnimation(glitch);
      cancelAnimation(scan);
    };
  }, [density, glitch, rain, scan]);

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.45, 0.7], [0.95, 0.55, 0.22]),
    transform: [{ scale: interpolate(cardFlip?.value ?? 0, [0, 0.55], [0.92, 1.12]) }],
  }));
  const rainStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(rain.value, [0, 1], [-90, 90]) }],
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.6, 1], [0.7, 0.32, 0.14]),
  }));
  const rgbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.5, 1], [0, 0.78, 0.1]),
    transform: [{ translateX: interpolate(glitch.value, [0, 1], [0, 8]) }],
  }));
  const pixelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.5, 0.78, 1], [0.55, 0.18, 0]),
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.72, 0.92], [0, 1]),
  }));
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scan.value, [0, 1], [-80, 640]) }],
    opacity: 0.55,
  }));
  const rings = Math.max(1, Math.min(4, rarityRings));
  const cols = density === "lite" ? 6 : 12;

  return (
    <View style={styles.host} pointerEvents="none">
      <LinearGradient colors={["#02040a", "#061428", "#0a2038"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.dataRain, rainStyle]}>
        {Array.from({ length: cols }).map((_, i) => (
          <View
            key={`col-${i}`}
            style={[styles.dataCol, { left: `${4 + i * (92 / cols)}%`, opacity: 0.18 + (i % 3) * 0.12 }]}
          />
        ))}
      </Animated.View>
      <Animated.View style={[styles.scanBeam, scanStyle]} />
      <View style={styles.hudTL} />
      <View style={styles.hudTR} />
      <View style={styles.hudBL} />
      <View style={styles.hudBR} />
      <View style={styles.skyline} />
      <View style={styles.centerStage}>
        <Animated.View style={[styles.hologram, shieldStyle]}>
          <View style={styles.hologramRing} />
          <View style={[styles.hologramRing, styles.hologramRingInner]} />
          <View style={styles.hologramCore} />
        </Animated.View>
        {Array.from({ length: rings }).map((_, i) => (
          <View
            key={`neon-${i}`}
            style={[
              styles.neonRing,
              {
                width: 168 + i * 42,
                height: 168 + i * 42,
                borderRadius: 84 + i * 21,
                opacity: 0.42 - i * 0.07,
              },
            ]}
          />
        ))}
      </View>
      <Animated.View style={[styles.rgbSplit, rgbStyle]}>
        <View style={styles.rgbRed} />
        <View style={styles.rgbCyan} />
      </Animated.View>
      <View style={styles.scanlines} />
      <Animated.View style={[styles.pixelGrid, pixelStyle]} />
      <Animated.Text style={[styles.cyberCaption, captionStyle]}>{t("revealOverlay.storyboardCyberCaption")}</Animated.Text>
    </View>
  );
}

function AsmrBoard({ cardFlip, flashOpacity, density = "full" }: BoardProps) {
  const { t } = useTranslation();
  const breath = useSharedValue(density === "lite" ? 0.5 : 0);
  const shimmer = useSharedValue(0);
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
    shimmer.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(breath);
      cancelAnimation(shimmer);
    };
  }, [breath, density, shimmer]);

  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.08]) }],
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.7, 1], [0.92, 0.5, 0.24]),
  }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.35, 1], [0.35, 0.95, 0.28]),
    transform: [
      { scale: interpolate(flashOpacity.value, [0, 1], [0.72, 1.38]) },
      { rotate: `${interpolate(shimmer.value, [0, 1], [-8, 8])}deg` },
    ],
  }));
  const petalStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.55, 0.85], [0.2, 0.95]),
    transform: [{ translateY: interpolate(cardFlip?.value ?? 0, [0.55, 1], [24, -18]) }],
  }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.7, 0.92], [0, 1]),
  }));
  const silkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.25, 0.55]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-12, 12]) }],
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, cloudStyle]}>
        <LinearGradient colors={["#f7ead0", "#e8d5b0", "#c9b48a"]} style={StyleSheet.absoluteFill} />
        <View style={styles.cloudA} />
        <View style={styles.cloudB} />
        <View style={styles.cloudC} />
      </Animated.View>
      <LinearGradient
        colors={["rgba(255,244,210,0.55)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.tyndall}
      />
      <Animated.View style={[styles.silk, silkStyle]} />
      <View style={styles.centerStage}>
        <Animated.View style={[styles.bloom, bloomStyle]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={`petal-${i}`}
              style={[
                styles.petal,
                {
                  transform: [{ rotate: `${i * 45}deg` }, { translateY: -28 }],
                  opacity: 0.42 + (i % 2) * 0.18,
                },
              ]}
            />
          ))}
          <View style={styles.bloomCore} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.floatPetals, petalStyle]}>
        <View style={[styles.bubble, { left: "18%", top: "28%" }]} />
        <View style={[styles.bubble, styles.bubbleSm, { left: "72%", top: "34%" }]} />
        <View style={[styles.bubble, { left: "58%", top: "62%" }]} />
        <View style={[styles.bubble, styles.bubbleLg, { left: "32%", top: "54%" }]} />
        <View style={[styles.spark, { left: "24%", top: "22%" }]} />
        <View style={[styles.spark, { left: "78%", top: "48%" }]} />
        <View style={[styles.spark, { left: "46%", top: "18%" }]} />
      </Animated.View>
      <Animated.Text style={[styles.asmrCaption, captionStyle]}>{t("revealOverlay.storyboardAsmrCaption")}</Animated.Text>
    </View>
  );
}

function PartyBoard({ cardFlip, flashOpacity, prizeName, density = "full" }: BoardProps) {
  const { t } = useTranslation();
  const beat = useSharedValue(density === "lite" ? 0.4 : 0);
  const marquee = useSharedValue(0);
  const spin = useSharedValue(0);
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
    spin.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(beat);
      cancelAnimation(marquee);
      cancelAnimation(spin);
    };
  }, [beat, density, marquee, spin]);

  const discoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0, 0.55, 1], [0.95, 0.7, 0.5]),
    transform: [
      { rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg` },
      { scale: interpolate(beat.value, [0, 1], [0.96, 1.08]) },
    ],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashOpacity.value, [0, 0.45, 1], [0.15, 1, 0.18]),
    transform: [{ scale: interpolate(flashOpacity.value, [0, 1], [0.45, 1.85]) }],
  }));
  const stageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip?.value ?? 0, [0.55, 0.85], [0.35, 1]),
  }));
  const marqueeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(marquee.value, [0, 1], [160, -280]) }],
    opacity: interpolate(cardFlip?.value ?? 0, [0.65, 0.85], [0.4, 1]),
  }));
  const lightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0, 1], [0.22, 0.82]),
  }));
  const confettiStyle = useAnimatedStyle(() => ({
    opacity: interpolate(beat.value, [0, 1], [0.35, 0.9]),
    transform: [{ translateY: interpolate(beat.value, [0, 1], [0, 10]) }],
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <LinearGradient colors={["#1a0820", "#3a1048", "#120818"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.spotA, lightStyle]} />
      <Animated.View style={[styles.spotB, lightStyle]} />
      <Animated.View style={[styles.spotC, lightStyle]} />
      <View style={styles.laserA} />
      <View style={styles.laserB} />
      <View style={styles.centerStage}>
        <Animated.View style={[styles.disco, discoStyle]}>
          <View style={styles.discoFacet} />
          <View style={[styles.discoFacet, styles.discoFacetAlt]} />
        </Animated.View>
        <Animated.View style={[styles.burst, burstStyle]} />
      </View>
      <Animated.View style={[styles.confettiLayer, confettiStyle]}>
        {PARTY_CONFETTI.map((bit) => (
          <View key={bit.key} style={[styles.confetti, bit.style]} />
        ))}
      </Animated.View>
      <Animated.View style={[styles.stage, stageStyle]}>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)", "rgba(40,10,50,0.9)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.crowd} />
      </Animated.View>
      <Animated.Text style={[styles.marquee, marqueeStyle]}>
        {t("revealOverlay.storyboardPartyMarquee", { name: prizeName || t("revealOverlay.feedTickerPrize") })}
      </Animated.Text>
    </View>
  );
}

const PARTY_CONFETTI = [
  { key: "c1", style: { left: "12%", top: "18%", backgroundColor: "#FF80AB" } },
  { key: "c2", style: { left: "28%", top: "12%", backgroundColor: "#FFE082" } },
  { key: "c3", style: { left: "68%", top: "16%", backgroundColor: "#82B1FF" } },
  { key: "c4", style: { left: "82%", top: "24%", backgroundColor: "#EA80FC" } },
  { key: "c5", style: { left: "20%", top: "42%", backgroundColor: "#69F0AE" } },
  { key: "c6", style: { left: "74%", top: "46%", backgroundColor: "#FF8A80" } },
  { key: "c7", style: { left: "48%", top: "14%", backgroundColor: "#FFFFFF" } },
  { key: "c8", style: { left: "58%", top: "38%", backgroundColor: "#FFD54F" } },
];

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: revealLayerZIndex.backdrop + 40,
    overflow: "hidden",
  },
  centerStage: {
    position: "absolute",
    top: "18%",
    left: 0,
    right: 0,
    height: "52%",
    alignItems: "center",
    justifyContent: "center",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 18,
    borderColor: "rgba(90,60,30,0.35)",
    opacity: 0.5,
  },
  mapTrail: {
    position: "absolute",
    left: "18%",
    top: "32%",
    width: "64%",
    height: 2,
    backgroundColor: "rgba(196,165,116,0.35)",
    transform: [{ rotate: "-18deg" }],
  },
  mapTrailAlt: {
    top: "48%",
    transform: [{ rotate: "12deg" }],
    opacity: 0.55,
  },
  ember: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,170,60,0.7)",
    shadowColor: "#FFB74D",
    shadowOpacity: 0.95,
    shadowRadius: 18,
    bottom: "16%",
  },
  emberL: { left: "8%" },
  emberR: { right: "8%" },
  emberM: { left: "46%", bottom: "22%", width: 18, height: 18, borderRadius: 9 },
  compassHalo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(224,196,138,0.16)",
  },
  compass: {
    width: 128,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
  },
  compassRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: "rgba(224,196,138,0.92)",
  },
  compassRingInner: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255,224,160,0.45)",
  },
  compassTickN: {
    position: "absolute",
    top: 8,
    width: 3,
    height: 12,
    backgroundColor: "#E8C36A",
  },
  compassTickE: {
    position: "absolute",
    right: 8,
    width: 12,
    height: 3,
    backgroundColor: "rgba(232,195,106,0.7)",
  },
  compassNeedle: {
    width: 8,
    height: 56,
    backgroundColor: "#E8C36A",
    borderRadius: 2,
  },
  compassHub: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFF3C4",
  },
  goldSlit: {
    position: "absolute",
    width: 8,
    height: "78%",
    backgroundColor: "rgba(255,220,120,0.88)",
    shadowColor: "#FFD54F",
    shadowOpacity: 0.95,
    shadowRadius: 22,
  },
  fog: {
    ...StyleSheet.absoluteFillObject,
  },
  treasureMark: {
    position: "absolute",
    bottom: "8%",
  },
  treasureX: {
    color: "rgba(200,48,48,0.92)",
    fontSize: 52,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowRadius: 8,
  },
  caption: {
    position: "absolute",
    bottom: "12%",
    alignSelf: "center",
    color: "rgba(255,236,200,0.94)",
    fontSize: 14,
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  hologram: {
    width: 236,
    height: 236,
    alignItems: "center",
    justifyContent: "center",
  },
  hologramRing: {
    width: 236,
    height: 236,
    borderRadius: 118,
    borderWidth: 2,
    borderColor: "rgba(0,229,255,0.7)",
  },
  hologramRingInner: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderColor: "rgba(234,128,252,0.55)",
  },
  hologramCore: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,229,255,0.22)",
  },
  dataRain: {
    ...StyleSheet.absoluteFillObject,
  },
  dataCol: {
    position: "absolute",
    top: 0,
    width: 2,
    height: "100%",
    backgroundColor: "rgba(0,255,200,0.28)",
  },
  scanBeam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: "rgba(0,229,255,0.18)",
  },
  hudTL: {
    position: "absolute",
    top: "8%",
    left: "6%",
    width: 42,
    height: 42,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: "rgba(0,229,255,0.65)",
  },
  hudTR: {
    position: "absolute",
    top: "8%",
    right: "6%",
    width: 42,
    height: 42,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: "rgba(234,128,252,0.55)",
  },
  hudBL: {
    position: "absolute",
    bottom: "14%",
    left: "6%",
    width: 42,
    height: 42,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(0,229,255,0.45)",
  },
  hudBR: {
    position: "absolute",
    bottom: "14%",
    right: "6%",
    width: 42,
    height: 42,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(234,128,252,0.4)",
  },
  skyline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "16%",
    backgroundColor: "rgba(0,20,40,0.55)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,229,255,0.25)",
  },
  rgbSplit: {
    ...StyleSheet.absoluteFillObject,
  },
  rgbRed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,40,80,0.16)",
    transform: [{ translateX: -6 }],
  },
  rgbCyan: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,220,255,0.14)",
    transform: [{ translateX: 6 }],
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pixelGrid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,20,40,0.18)",
  },
  neonRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(0,229,255,0.5)",
  },
  cyberCaption: {
    position: "absolute",
    bottom: "12%",
    alignSelf: "center",
    color: "#18FFFF",
    fontSize: 13,
    letterSpacing: 2.4,
    fontWeight: "800",
  },
  cloudA: {
    position: "absolute",
    width: "48%",
    height: "14%",
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.38)",
    top: "16%",
    left: "6%",
  },
  cloudB: {
    position: "absolute",
    width: "40%",
    height: "12%",
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    top: "22%",
    right: "4%",
  },
  cloudC: {
    position: "absolute",
    width: "36%",
    height: "10%",
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.22)",
    top: "38%",
    left: "28%",
  },
  tyndall: {
    position: "absolute",
    top: 0,
    left: "18%",
    width: "64%",
    height: "58%",
  },
  silk: {
    position: "absolute",
    top: "20%",
    left: "-10%",
    width: "120%",
    height: 18,
    backgroundColor: "rgba(255,182,193,0.22)",
    transform: [{ rotate: "-8deg" }],
  },
  bloom: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  petal: {
    position: "absolute",
    width: 42,
    height: 78,
    borderRadius: 21,
    backgroundColor: "rgba(255,128,171,0.55)",
  },
  bloomCore: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,236,179,0.92)",
  },
  floatPetals: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,200,230,0.7)",
  },
  bubbleSm: { width: 14, height: 14, borderRadius: 7 },
  bubbleLg: { width: 34, height: 34, borderRadius: 17 },
  spark: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,248,220,0.9)",
  },
  asmrCaption: {
    position: "absolute",
    bottom: "12%",
    alignSelf: "center",
    color: "rgba(90,50,40,0.9)",
    fontSize: 14,
    fontWeight: "700",
  },
  disco: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 5,
    borderColor: "rgba(255,213,79,0.95)",
    overflow: "hidden",
    zIndex: 3,
  },
  discoFacet: {
    position: "absolute",
    width: 28,
    height: 28,
    backgroundColor: "rgba(130,177,255,0.55)",
    top: 12,
    left: 16,
    transform: [{ rotate: "18deg" }],
  },
  discoFacetAlt: {
    top: 40,
    left: 42,
    backgroundColor: "rgba(255,128,171,0.5)",
  },
  spotA: {
    position: "absolute",
    width: "38%",
    height: "42%",
    top: "10%",
    left: "2%",
    backgroundColor: "rgba(255,80,180,0.28)",
    transform: [{ rotate: "-18deg" }],
  },
  spotB: {
    position: "absolute",
    width: "38%",
    height: "42%",
    top: "10%",
    right: "2%",
    backgroundColor: "rgba(80,180,255,0.28)",
    transform: [{ rotate: "18deg" }],
  },
  spotC: {
    position: "absolute",
    width: "24%",
    height: "36%",
    top: "6%",
    alignSelf: "center",
    left: "38%",
    backgroundColor: "rgba(255,230,120,0.18)",
  },
  laserA: {
    position: "absolute",
    top: "12%",
    left: "8%",
    width: 4,
    height: "48%",
    backgroundColor: "rgba(255,64,129,0.35)",
    transform: [{ rotate: "22deg" }],
  },
  laserB: {
    position: "absolute",
    top: "12%",
    right: "10%",
    width: 4,
    height: "48%",
    backgroundColor: "rgba(64,196,255,0.35)",
    transform: [{ rotate: "-22deg" }],
  },
  burst: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,230,120,0.5)",
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 18,
    borderRadius: 2,
    transform: [{ rotate: "18deg" }],
  },
  stage: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "26%",
  },
  crowd: {
    position: "absolute",
    left: "6%",
    right: "6%",
    bottom: "10%",
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  marquee: {
    position: "absolute",
    top: "7%",
    color: "#FFE082",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.4,
    textShadowColor: "rgba(255,64,129,0.6)",
    textShadowRadius: 8,
  },
});
