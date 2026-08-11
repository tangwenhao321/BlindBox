import { StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { RemoteImage } from "./RemoteImage";
import { QualityBadge } from "./QualityBadge";
import { RevealRareGlow } from "./RevealRareGlow";
import { LustreCardEdgeShimmer } from "./LustreCardEdgeShimmer";
import { resolveCardBackPulseIntensity } from "../../effects/revealRemote";
import { revealVisualTokens } from "../../effects/revealVisualTokens";
import { resolveCardStackStagger } from "../../effects/revealLayerZIndex";
import { resolveAmbientLightCoeffs } from "../../effects/revealAmbientLight";
import { useAppTheme } from "../../context/ThemeContext";
import { normalizeQualityTier } from "../../utils/quality";
import type { PrizeTier } from "../../effects/config";

type Props = {
  imageUri?: string;
  prizeName?: string;
  qualityType?: string;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  cardFlip: SharedValue<number>;
  accentColor: string;
  tier?: string;
  lustreRim?: readonly string[];
  reduceMotion?: boolean;
  breathPeriodMs?: number;
  revealIndex?: number;
};

const CARD = 148;

/** 奖品卡：背面问号 → 翻转正面 + 稀有款呼吸光 */
export function RevealPrizeCard({
  imageUri,
  prizeName,
  qualityType,
  scale,
  opacity,
  cardFlip,
  accentColor,
  tier: tierProp,
  lustreRim,
  reduceMotion = false,
  breathPeriodMs = 900,
  revealIndex = 0,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const stack = useMemo(() => resolveCardStackStagger(revealIndex), [revealIndex]);
  const lightCoeffs = useMemo(() => resolveAmbientLightCoeffs(colors), [colors]);
  const normalized = normalizeQualityTier(qualityType);
  const tierKey = (tierProp === "LEGENDARY" || tierProp === "HIDDEN" ? tierProp : normalized) as PrizeTier;
  const isRare = tierKey === "LEGENDARY" || tierKey === "HIDDEN" || normalized === "LEGENDARY" || normalized === "HIDDEN";
  const pulseIntensity = resolveCardBackPulseIntensity(isRare);

  const hostStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: interpolate(scale.value, [0, 1], [0.2, 1]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scale.value, [0, 0.6, 1], [0.5, 1.15, 1]) }],
  }));

  const flipStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: interpolate(cardFlip.value, [0, 1], [180, 0]) + "deg" },
      { rotateX: interpolate(cardFlip.value, [0, 0.5, 1], [8, -2, -4]) + "deg" },
      { translateY: interpolate(cardFlip.value, [0, 0.5, 1], [6, -2, 0]) },
    ],
    shadowColor: accentColor,
    shadowOffset: {
      width: interpolate(cardFlip.value, [0, 0.5, 1], [0, 4, 8]),
      height: interpolate(cardFlip.value, [0, 0.5, 1], [2, 8, 14]),
    },
    shadowOpacity: interpolate(cardFlip.value, [0, 0.45, 1], [0.15, 0.35, 0.55]) * lightCoeffs.shadowOpacityScale,
    shadowRadius: interpolate(cardFlip.value, [0, 1], [6 + stack.shadowRadiusBoost, 18 + stack.shadowRadiusBoost]),
    elevation: interpolate(cardFlip.value, [0, 1], [2, 10]),
  }));

  const spotLightStyle = useAnimatedStyle(() => ({
    opacity:
      interpolate(cardFlip.value, [0, 0.35, 0.7, 1], [0, 0.85, 0.45, 0.2]) * lightCoeffs.spotLightOpacityScale,
    transform: [
      { translateX: interpolate(cardFlip.value, [0, 1], [-CARD * 0.4, CARD * 0.35]) },
      { rotate: "-18deg" },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip.value, [0, 0.45, 0.55, 1], [1, 1, 0, 0]),
  }));

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip.value, [0, 0.45, 0.55, 1], [0, 0, 1, 1]),
  }));

  const nameStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip.value, [0, 0.65, 1], [0, 0, 1]),
  }));

  const badgeRevealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip.value, [0, 0.55, 1], [0, 0, 1]),
  }));

  const backGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip.value, [0, 0.35, 0.55], [0.55, 0.85, 0.35].map((v) => v * pulseIntensity)),
    transform: [{ scale: interpolate(cardFlip.value, [0, 0.35, 1], [0.92, 1.08, 1]) }],
  }));

  const colorWashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(cardFlip.value, [0, 0.35, 0.65, 1], [0, 0.28, 0.12, 0]),
  }));

  if (!imageUri && !prizeName) return null;

  const rimColors = lustreRim && lustreRim.length > 0 ? lustreRim : [accentColor, "#ffffff", accentColor];

  return (
    <Animated.View
      style={[styles.host, hostStyle, { zIndex: stack.zIndex }]}
      pointerEvents="none"
      accessibilityRole="summary"
      accessibilityLabel={t("revealA11y.prizeCard", {
        name: prizeName ?? t("revealOverlay.feedTickerPrize"),
      })}
      accessibilityLiveRegion="polite"
    >
      {isRare ? (
        <RevealRareGlow
          cardSize={CARD}
          enabled
          lustreRim={rimColors}
          reduceMotion={reduceMotion}
          breathPeriodMs={breathPeriodMs}
        />
      ) : (
        <Animated.View style={[styles.glowRing, { borderColor: accentColor }, glowStyle, backGlowStyle]} />
      )}
      <Animated.View style={[styles.spotLight, spotLightStyle]} pointerEvents="none">
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={flipStyle}>
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.colorWash, { backgroundColor: accentColor }, colorWashStyle]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.face, backStyle]}>
          {isRare ? (
            <LustreCardEdgeShimmer
              width={CARD}
              height={CARD}
              borderRadius={20}
              colors={rimColors}
              borderWidth={2.5}
              reduceMotion={reduceMotion}
              breathPeriodMs={Math.round(breathPeriodMs * 2.8)}
              innerBackground="#14141c"
            >
              <LinearGradient colors={["#2a2540", "#14141c"]} style={styles.frameInner}>
                <Text style={styles.mysteryIcon}>?</Text>
                <Text style={styles.mysteryHint}>{t("revealOverlay.revealing")}</Text>
              </LinearGradient>
            </LustreCardEdgeShimmer>
          ) : (
            <LinearGradient colors={["#2a2540", "#14141c"]} style={styles.frame}>
              <Text style={styles.mysteryIcon}>?</Text>
              <Text style={styles.mysteryHint}>{t("revealOverlay.revealing")}</Text>
            </LinearGradient>
          )}
        </Animated.View>
        <Animated.View style={[styles.face, styles.faceFront, frontStyle]}>
          {isRare ? (
            <LustreCardEdgeShimmer
              width={CARD}
              height={CARD}
              borderRadius={20}
              colors={rimColors}
              borderWidth={2.5}
              reduceMotion={reduceMotion}
              breathPeriodMs={Math.round(breathPeriodMs * 2.8)}
              innerBackground="#0d0d12"
            >
              <LinearGradient colors={[`${accentColor}55`, "#1a1a24", "#0d0d12"]} style={styles.frameInner}>
                {imageUri ? (
                  <RemoteImage uri={imageUri} style={styles.image} contentFit="cover" />
                ) : (
                  <View style={styles.imagePlaceholder} />
                )}
                {qualityType ? (
                  <Animated.View style={[styles.badgeWrap, badgeRevealStyle]}>
                    <QualityBadge tier={normalized} compact />
                  </Animated.View>
                ) : null}
              </LinearGradient>
            </LustreCardEdgeShimmer>
          ) : (
            <LinearGradient colors={[`${accentColor}55`, "#1a1a24", "#0d0d12"]} style={styles.frame}>
              {imageUri ? (
                <RemoteImage uri={imageUri} style={styles.image} contentFit="cover" />
              ) : (
                <View style={styles.imagePlaceholder} />
              )}
              {qualityType ? (
                <Animated.View style={[styles.badgeWrap, badgeRevealStyle]}>
                  <QualityBadge tier={normalized} compact />
                </Animated.View>
              ) : null}
            </LinearGradient>
          )}
        </Animated.View>
      </Animated.View>
      {prizeName ? (
        <Animated.Text style={[styles.name, nameStyle]} numberOfLines={2}>
          {prizeName}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    alignSelf: "center",
    top: "32%",
    alignItems: "center",
    zIndex: 12,
    maxWidth: CARD + 48,
  },
  glowRing: {
    position: "absolute",
    width: CARD + 36,
    height: CARD + 36,
    borderRadius: (CARD + 36) / 2,
    borderWidth: 2,
    opacity: 0.65,
  },
  colorWash: {
    borderRadius: 20,
    zIndex: 2,
  },
  spotLight: {
    position: "absolute",
    top: 0,
    left: CARD * 0.15,
    width: CARD * 0.35,
    height: CARD,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 2,
  },
  face: {
    width: CARD,
    height: CARD,
    backfaceVisibility: "hidden",
  },
  faceFront: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  frame: {
    width: CARD,
    height: CARD,
    borderRadius: revealVisualTokens.cardRadius,
    padding: 3,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  frameInner: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    padding: 3,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  mysteryIcon: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 56,
    fontWeight: "900",
  },
  mysteryHint: {
    marginTop: 4,
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },
  image: { width: "100%", height: "100%", borderRadius: 16 },
  imagePlaceholder: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  badgeWrap: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  name: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    paddingHorizontal: 8,
  },
});
