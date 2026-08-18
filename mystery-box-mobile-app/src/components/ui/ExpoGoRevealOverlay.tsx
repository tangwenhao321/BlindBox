import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import type { EffectProfile } from "../../effects/config";
import {
  isPremiumCeremony,
  isUltimateCeremony,
  normalizeCeremonyTier,
  type CeremonyTier,
} from "../../effects/ceremonyTier";
import { pickLustreColor, lustreGradientStops, tintLustrePalette } from "../../effects/lustrePalette";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";
import { resolveThemedLustre } from "../../effects/revealTheme";
import { storyboardBackdrop } from "../../effects/revealStoryboard";
import { CinematicRevealLayerLite } from "./CinematicRevealLayerLite";
import { resolveLustreIntensity, shouldReduceLustreMotion } from "../../effects/revealRemote";
import { getAtmosphereOverrides } from "../../effects/revealAtmosphereRuntime";
import { resolveRevealEffectPreset } from "../../effects/revealEffectPreset";
import { getRuntimeRevealEffectPresetId } from "../../utils/revealSettings";
import { getExpoRevealTimeline } from "../../effects/expoRevealTiming";
import type { RevealPacing } from "../../effects/revealSequence";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { normalizeQualityTier } from "../../utils/quality";
import { RemoteImage } from "./RemoteImage";
import { QualityBadge } from "./QualityBadge";
import { LustreGradientRing, RevealLustreLayers } from "./RevealLustreLayers";
import { LustreCardEdgeShimmer } from "./LustreCardEdgeShimmer";
import type { ThemeColors } from "../../styles/themes";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CONFETTI_N = 28;
const SPARKLE_N = 20;
const RAY_N = 12;
const PRIZE_IMG = 132;
const CARD_W = Math.min(SCREEN_W - 52, 296);

type Props = {
  visible: boolean;
  tier: string;
  profile: EffectProfile;
  revealTheme?: import("../../effects/revealTheme").RevealTheme;
  subtitle?: string;
  prizeName?: string;
  prizeImageUri?: string;
  prizeQualityType?: string;
  boxCoverUri?: string;
  boxId?: string;
  showBoxTeaser?: boolean;
  pacing?: RevealPacing;
  playToken?: string | number;
  skipParticles?: boolean;
  atmosphereParticleScale?: number;
  reduceMotion?: boolean;
  onPressSkip?: () => void;
  onLongPressAccelerate?: () => void;
  pityBanner?: string;
};

function tierAccent(tier: CeremonyTier, brand: string, warning: string) {
  if (tier === "TREASURE_PEERLESS") return "#E0C48A";
  if (tier === "PEERLESS") return "#D4A060";
  if (tier === "TREASURE_LEGEND") return warning;
  if (tier === "HIDDEN") return "#C4A574";
  return brand;
}

const SPARKLE = ["★", "✦", "·", "◆", "•"];

function tierMarker(tier: CeremonyTier) {
  if (tier === "TREASURE_PEERLESS") return "★★";
  if (tier === "PEERLESS") return "★";
  if (tier === "TREASURE_LEGEND") return "★";
  if (tier === "HIDDEN") return "✦";
  return "•";
}

export function ExpoGoRevealOverlay({
  visible,
  tier,
  profile,
  revealTheme,
  subtitle,
  prizeName,
  prizeImageUri,
  prizeQualityType,
  boxCoverUri,
  boxId,
  showBoxTeaser = false,
  pacing = "normal",
  playToken: playTokenProp,
  skipParticles = false,
  atmosphereParticleScale = 1,
  reduceMotion = false,
  onPressSkip,
  onLongPressAccelerate,
  pityBanner,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildExpoGoRevealStyles);
  const tierKey = normalizeCeremonyTier(tier);
  const atmosphere = getAtmosphereOverrides();
  const effectPreset = resolveRevealEffectPreset(getRuntimeRevealEffectPresetId());
  const lustre = useMemo(() => {
    let palette = resolveThemedLustre(tierKey, revealTheme, boxId);
    if (effectPreset.lustrePaletteId === "warm") {
      palette = tintLustrePalette(palette, "#FB923C", 0.24);
    } else if (effectPreset.lustrePaletteId === "neon") {
      palette = tintLustrePalette(palette, "#00E5FF", 0.28);
    }
    if (atmosphere.lustreTintAccent && (atmosphere.lustreTintStrength ?? 0) > 0) {
      palette = tintLustrePalette(palette, atmosphere.lustreTintAccent, atmosphere.lustreTintStrength);
    }
    return palette;
  }, [
    tierKey,
    revealTheme,
    boxId,
    effectPreset.lustrePaletteId,
    atmosphere.lustreTintAccent,
    atmosphere.lustreTintStrength,
  ]);
  const isCeremony = isPremiumCeremony(tierKey);
  const isUltimate = isUltimateCeremony(tierKey);
  const lustreIntensity = resolveLustreIntensity(
    isUltimate ? 1 : isCeremony ? 0.82 : tierKey === "HIDDEN" ? 0.58 : 0.42,
  );
  const lustreMotion = shouldReduceLustreMotion(reduceMotion);
  const displaySubtitle = subtitle ?? t("orderResult.revealSuccessSubtitle");
  const isQuickReveal = pacing === "fast";
  const timeline = useMemo(
    () => getExpoRevealTimeline(pacing, { showBoxTeaser, ceremony: tierKey }),
    [pacing, showBoxTeaser, tierKey],
  );
  const playToken = playTokenProp ?? prizeImageUri ?? prizeName ?? "prize";
  const playSessionRef = useRef(0);
  const pendingRevealRef = useRef(false);

  const hostOpacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const prizeOpacity = useRef(new Animated.Value(0)).current;
  const mysteryOpacity = useRef(new Animated.Value(1)).current;
  const [prizeImageReady, setPrizeImageReady] = useState(!prizeImageUri);
  const flash = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const raySpin = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const boxOpacity = useRef(new Animated.Value(0)).current;
  const chargeRing = useRef(new Animated.Value(0)).current;
  const confetti = useRef(Array.from({ length: CONFETTI_N }, () => new Animated.Value(0))).current;
  const sparkles = useRef(Array.from({ length: SPARKLE_N }, () => new Animated.Value(0))).current;

  const particleLayout = useMemo(() => {
    if (skipParticles) return [];
    const count = Math.max(0, Math.min(CONFETTI_N, Math.round(CONFETTI_N * atmosphereParticleScale)));
    return Array.from({ length: count }, (_, i) => ({
      left: (SCREEN_W * (i + 0.5)) / Math.max(count, 1),
      drift: ((i % 7) - 3) * 18,
      color:
        i % 3 === 0
          ? pickLustreColor(lustre, "sparkles", i)
          : pickLustreColor(lustre, "sparkles", i + 1),
    }));
  }, [lustre, skipParticles, atmosphereParticleScale]);

  useEffect(() => {
    setPrizeImageReady(!prizeImageUri);
  }, [prizeImageUri, playToken]);

  useEffect(() => {
    if (!visible) {
      hostOpacity.setValue(0);
      shakeX.setValue(0);
      cardScale.setValue(0.9);
      prizeOpacity.setValue(0);
      mysteryOpacity.setValue(1);
      flash.setValue(0);
      titleScale.setValue(0.8);
      raySpin.setValue(0);
      halo.setValue(0);
      boxOpacity.setValue(0);
      chargeRing.setValue(0);
      confetti.forEach((c) => c.setValue(0));
      sparkles.forEach((s) => s.setValue(0));
      return;
    }

    playSessionRef.current += 1;
    const session = playSessionRef.current;
    const isActive = () => session === playSessionRef.current;

    hostOpacity.setValue(0);
    shakeX.setValue(0);
    cardScale.setValue(0.9);
      prizeOpacity.setValue(0);
      mysteryOpacity.setValue(1);
    flash.setValue(0);
    titleScale.setValue(0.8);
    boxOpacity.setValue(0);
    chargeRing.setValue(0);
    confetti.forEach((c) => c.setValue(0));
    sparkles.forEach((s) => s.setValue(0));

    void Haptics.notificationAsync(
      isUltimate
        ? Haptics.NotificationFeedbackType.Success
        : isCeremony
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
    );

    const rayLoop = Animated.loop(
      Animated.timing(raySpin, {
        toValue: 1,
        duration: isUltimate ? 5200 : isCeremony ? 6200 : tierKey === "HIDDEN" ? 8200 : 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    rayLoop.start();
    haloLoop.start();

    const shakeSteps = isUltimate
      ? [16, -16, 12, -12, 9, -9, 6, -6, 0]
      : isCeremony
        ? [12, -12, 9, -9, 6, -6, 0]
        : tierKey === "HIDDEN"
          ? [8, -8, 5, -5, 0]
          : [4, -4, 0];

    const confettiMs = isQuickReveal ? 200 : pacing === "finale" ? 880 : 680;
    const sparkleStagger = isQuickReveal ? 8 : 26;
    const confettiStagger = isQuickReveal ? 10 : 30;

    const ambient = Animated.parallel([
      Animated.timing(hostOpacity, {
        toValue: 1,
        duration: isQuickReveal ? 180 : 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      ...(showBoxTeaser && boxCoverUri
        ? [
            Animated.sequence([
              Animated.timing(boxOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
              Animated.timing(boxOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
            ]),
          ]
        : []),
      ...(isCeremony && !isQuickReveal && profile.chargeMs > 0
        ? [
            Animated.loop(
              Animated.sequence([
                Animated.timing(chargeRing, { toValue: 1, duration: 520, useNativeDriver: true }),
                Animated.timing(chargeRing, { toValue: 0.35, duration: 520, useNativeDriver: true }),
              ]),
            ),
          ]
        : []),
      ...(isUltimate && !isQuickReveal
        ? [
            Animated.sequence([
              Animated.timing(flash, { toValue: profile.flashPeak * 0.65, duration: 70, useNativeDriver: true }),
              Animated.timing(flash, { toValue: 0, duration: 120, useNativeDriver: true }),
              Animated.timing(flash, { toValue: profile.flashPeak, duration: 90, useNativeDriver: true }),
              Animated.timing(flash, { toValue: 0, duration: 360, useNativeDriver: true }),
            ]),
          ]
        : [
            Animated.sequence([
              Animated.timing(flash, {
                toValue: profile.flashPeak,
                duration: 90,
                useNativeDriver: true,
              }),
              Animated.timing(flash, { toValue: 0, duration: isQuickReveal ? 160 : 320, useNativeDriver: true }),
            ]),
          ]),
      ...(isQuickReveal
        ? []
        : [
            Animated.stagger(
              sparkleStagger,
              sparkles.map((s) =>
                Animated.timing(s, { toValue: 1, duration: 420, useNativeDriver: true }),
              ),
            ),
            Animated.stagger(
              confettiStagger,
              confetti.map((c) =>
                Animated.timing(c, {
                  toValue: 1,
                  duration: confettiMs,
                  easing: Easing.out(Easing.quad),
                  useNativeDriver: true,
                }),
              ),
            ),
          ]),
    ]);

    const runRevealPrizeAnim = () => {
      if (!isActive()) return;
      pendingRevealRef.current = false;
      if (isQuickReveal) {
        const flipMs = 200;
        Animated.parallel([
          Animated.timing(mysteryOpacity, {
            toValue: 0,
            duration: flipMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(prizeOpacity, {
            toValue: 1,
            duration: flipMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 5,
            tension: 140,
            useNativeDriver: true,
          }),
          Animated.sequence(
            shakeSteps.map((x) =>
              Animated.timing(shakeX, { toValue: x, duration: 45, useNativeDriver: true }),
            ),
          ),
          Animated.spring(titleScale, {
            toValue: profile.pulseScale,
            friction: 4,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }
      Animated.parallel([
        Animated.timing(mysteryOpacity, {
          toValue: 0,
          duration: timeline.flipMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(prizeOpacity, {
          toValue: 1,
          duration: timeline.flipMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 5,
          tension: isUltimate ? 165 : isCeremony ? 150 : 120,
          useNativeDriver: true,
        }),
        Animated.sequence(
          shakeSteps.map((x) =>
            Animated.timing(shakeX, { toValue: x, duration: 45, useNativeDriver: true }),
          ),
        ),
        Animated.spring(titleScale, {
          toValue: profile.pulseScale,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const revealPrize = () => {
      if (!isActive()) return;
      if (!prizeImageReady && prizeImageUri) {
        pendingRevealRef.current = true;
        return;
      }
      runRevealPrizeAnim();
    };

    ambient.start();
    const revealDelayMs = isQuickReveal ? 180 : timeline.chargeMs + timeline.phase1Ms;
    const revealTimer = setTimeout(revealPrize, revealDelayMs);
    const forceRevealTimer = setTimeout(() => {
      if (!isActive() || !pendingRevealRef.current) return;
      setPrizeImageReady(true);
      runRevealPrizeAnim();
    }, revealDelayMs + 720);

    return () => {
      playSessionRef.current += 1;
      clearTimeout(revealTimer);
      clearTimeout(forceRevealTimer);
      rayLoop.stop();
      haloLoop.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [
    visible,
    playToken,
    pacing,
    isQuickReveal,
    timeline.phase1Ms,
    timeline.flipMs,
    timeline.chargeMs,
    showBoxTeaser,
    boxCoverUri,
    tierKey,
    prizeImageUri,
  ]);

  useEffect(() => {
    if (!visible || prizeImageReady || !prizeImageUri) return;
    const waitMs = isQuickReveal ? 80 : Math.min(420, timeline.chargeMs + timeline.phase1Ms);
    const timer = setTimeout(() => setPrizeImageReady(true), waitMs);
    return () => clearTimeout(timer);
  }, [visible, prizeImageReady, prizeImageUri, isQuickReveal, timeline.chargeMs, timeline.phase1Ms]);

  useEffect(() => {
    if (!visible || !prizeImageReady || !pendingRevealRef.current) return;
    pendingRevealRef.current = false;
    const flipMs = isQuickReveal ? 200 : timeline.flipMs;
    Animated.parallel([
      Animated.timing(mysteryOpacity, {
        toValue: 0,
        duration: flipMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(prizeOpacity, {
        toValue: 1,
        duration: flipMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 5,
        tension: isQuickReveal ? 140 : isUltimate ? 165 : isCeremony ? 150 : 120,
        useNativeDriver: true,
      }),
      Animated.spring(titleScale, {
        toValue: profile.pulseScale,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    visible,
    prizeImageReady,
    prizeImageUri,
    isQuickReveal,
    timeline.flipMs,
    isUltimate,
    isCeremony,
    profile.pulseScale,
    mysteryOpacity,
    prizeOpacity,
    cardScale,
    titleScale,
  ]);

  if (!visible) return null;

  const rayRotate = raySpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const haloScale = halo.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });

  const quality = prizeQualityType ? normalizeQualityTier(prizeQualityType) : null;

  return (
    <Pressable
      style={styles.host}
      onPress={onPressSkip}
      onLongPress={onLongPressAccelerate}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={t("revealOverlay.skipOrAccelerateA11y")}
    >
      <Animated.View style={[styles.inner, { opacity: hostOpacity, transform: [{ translateX: shakeX }] }]}>
        {revealTheme?.storyboard && revealTheme.storyboard !== "classic" ? (
          <LinearGradient
            colors={storyboardBackdrop(revealTheme.storyboard)}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}
        {revealTheme?.storyboard ? (
          <CinematicRevealLayerLite storyboard={revealTheme.storyboard} reduceMotion={reduceMotion} />
        ) : null}
        {revealTheme?.storyboard && revealTheme.storyboard !== "classic" ? (
          <Text style={styles.storyboardCaption} pointerEvents="none">
            {revealTheme.storyboard === "cyberpunk"
              ? t("revealOverlay.storyboardCyberCaption")
              : revealTheme.storyboard === "asmr"
                ? t("revealOverlay.storyboardAsmrCaption")
                : revealTheme.storyboard === "party"
                  ? t("revealOverlay.storyboardPartyMarquee", { name: prizeName || t("revealOverlay.feedTickerPrize") })
                  : t("revealOverlay.storyboardAdventureCaption", { name: prizeName || t("revealOverlay.feedTickerPrize") })}
          </Text>
        ) : null}
        <RevealLustreLayers
          visible={visible}
          tier={tier}
          intensity={lustreIntensity}
          palette={lustre}
          reduceMotion={lustreMotion}
        />
        <Animated.View style={[styles.flash, { opacity: flash }]}>
          <LinearGradient colors={lustreGradientStops(lustre.flashTint)} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        </Animated.View>

        {profile.rayCount > 0 && !isQuickReveal ? (
          <Animated.View style={[styles.raysHost, { transform: [{ rotate: rayRotate }] }]}>
            {Array.from({ length: RAY_N }).map((_, i) => (
              <View
                key={`ray-${i}`}
                style={[
                  styles.ray,
                  {
                    backgroundColor: pickLustreColor(lustre, "rays", i),
                    opacity: 0.16 + (i % 3) * 0.05,
                    transform: [{ rotate: `${(360 / RAY_N) * i}deg` }],
                  },
                ]}
              />
            ))}
          </Animated.View>
        ) : null}

        {!isQuickReveal ? (
          <Animated.View
            style={[
              styles.haloRingWrap,
              {
                opacity: halo,
                transform: [{ scale: haloScale }],
              },
            ]}
          >
            <LinearGradient colors={lustreGradientStops(lustre.halo)} style={styles.haloRingGrad} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} />
          </Animated.View>
        ) : null}

        {!isQuickReveal
          ? particleLayout.map((p, i) => {
              const progress = confetti[i];
              const translateY = progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, SCREEN_H * 0.55],
              });
              const translateX = progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, p.drift],
              });
              const opacity = progress.interpolate({
                inputRange: [0, 0.15, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              });
              return (
                <Animated.View
                  key={`confetti-${i}`}
                  style={[
                    styles.confetti,
                    {
                      left: p.left,
                      backgroundColor: p.color,
                      opacity,
                      transform: [{ translateY }, { translateX }, { rotate: `${(i % 6) * 30}deg` }],
                    },
                  ]}
                />
              );
            })
          : null}

        {!isQuickReveal
          ? sparkles.map((s, i) => {
              const opacity = s;
              const scale = s.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] });
              return (
                <Animated.Text
                  key={`spark-${i}`}
                  style={[
                    styles.sparkle,
                    {
                      left: (SCREEN_W * i) / SPARKLE_N,
                      top: SCREEN_H * (0.18 + (i % 8) * 0.05),
                      color: pickLustreColor(lustre, "sparkles", i),
                      fontSize: 14 + (i % 5) * 3,
                      opacity,
                      transform: [{ scale }],
                    },
                  ]}
                >
                  {SPARKLE[i % SPARKLE.length]}
                </Animated.Text>
              );
            })
          : null}

        {showBoxTeaser && boxCoverUri ? (
          <Animated.View style={[styles.boxTeaser, { opacity: boxOpacity }]}>
            <Image source={{ uri: boxCoverUri }} style={styles.boxImage} contentFit="cover" cachePolicy="memory-disk" />
            <Text style={styles.boxTeaserLabel}>{t("revealOverlay.opening")}</Text>
          </Animated.View>
        ) : null}

        <Animated.View
            style={[
              styles.cardOuter,
              {
                zIndex: 800,
                elevation: 12,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
          <LustreCardEdgeShimmer
            width={CARD_W}
            borderRadius={24}
            colors={lustre.rim}
            borderWidth={2}
            reduceMotion={lustreMotion}
            innerBackground="rgba(255,255,255,0.96)"
          >
            <View style={styles.card}>
          {isCeremony && !isQuickReveal ? (
            <Animated.View
              style={[
                styles.chargeRingHost,
                {
                  opacity: chargeRing,
                  transform: [
                    {
                      scale: chargeRing.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.88, 1.12],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LustreGradientRing size={PRIZE_IMG + 48} colors={lustre.rim} borderWidth={2.5} innerOpacity={0.82} />
            </Animated.View>
          ) : null}
          {!isQuickReveal ? (
            <Animated.View style={[styles.mysteryWrap, { opacity: mysteryOpacity }]}>
              <LinearGradient colors={["#1a1612", "#0c0a08"]} style={styles.mysteryFrame}>
                <Text style={styles.mysteryIcon}>?</Text>
                <Text style={styles.mysteryHint}>{t("revealOverlay.revealing")}</Text>
              </LinearGradient>
            </Animated.View>
          ) : null}

          <Animated.View
            style={[
              styles.prizeWrap,
              { opacity: isQuickReveal || prizeImageReady ? prizeOpacity : 0 },
            ]}
          >
            <View style={styles.imageFrame}>
              {prizeImageUri ? (
                <RemoteImage
                  uri={prizeImageUri}
                  style={styles.prizeImage}
                  contentFit="cover"
                  transitionMs={0}
                  priority="high"
                  onReady={() => setPrizeImageReady(true)}
                  accessibilityLabel={prizeName ?? t("revealOverlay.prizeImageA11y")}
                />
              ) : (
                <View style={[styles.prizeImage, styles.prizePlaceholder]}>
                  <Text style={[styles.cardEmoji, { color: tierAccent(tierKey, colors.brand, colors.warning) }]}>
                    {tierMarker(tierKey)}
                  </Text>
                </View>
              )}
              {quality ? (
                <View style={styles.qualityBadgeWrap}>
                  <QualityBadge tier={quality} compact />
                </View>
              ) : null}
            </View>
            {prizeName ? (
              <Text style={styles.prizeName} numberOfLines={2}>
                {prizeName}
              </Text>
            ) : null}
          </Animated.View>
            </View>
          </LustreCardEdgeShimmer>
        </Animated.View>

        <Animated.Text style={[styles.title, { transform: [{ scale: titleScale }] }]}>
          {displaySubtitle}
        </Animated.Text>
        {pityBanner ? <Text style={styles.pityBanner}>{pityBanner}</Text> : null}
        <Text style={styles.hint}>{t("revealOverlay.tapSkip")}</Text>
      </Animated.View>
    </Pressable>
  );
}

function buildExpoGoRevealStyles(colors: ThemeColors) {
  return StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: revealLayerZIndex.overlay,
    elevation: revealLayerZIndex.overlay,
  },
  inner: { flex: 1, alignItems: "center", justifyContent: "center" },
  storyboardCaption: {
    position: "absolute",
    top: SCREEN_H * 0.12,
    left: 24,
    right: 24,
    textAlign: "center",
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: "700",
    zIndex: 4,
  },
  dim: { ...StyleSheet.absoluteFillObject },
  flash: {
    ...StyleSheet.absoluteFillObject,
  },
  raysHost: {
    position: "absolute",
    width: SCREEN_W * 1.2,
    height: SCREEN_W * 1.2,
    left: -SCREEN_W * 0.1,
    top: SCREEN_H * 0.12,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.22,
    zIndex: revealLayerZIndex.rays,
  },
  ray: {
    position: "absolute",
    width: 3,
    height: SCREEN_H * 0.42,
    top: SCREEN_H * 0.08,
    borderRadius: 2,
    opacity: 0.55,
  },
  haloRingWrap: {
    position: "absolute",
    width: SCREEN_W * 0.72,
    height: SCREEN_W * 0.72,
    borderRadius: SCREEN_W * 0.36,
    top: SCREEN_H * 0.22,
    overflow: "hidden",
    zIndex: revealLayerZIndex.particles,
  },
  haloRingGrad: {
    flex: 1,
    borderRadius: SCREEN_W * 0.36,
  },
  confetti: {
    position: "absolute",
    width: 9,
    height: 16,
    borderRadius: 2,
    top: SCREEN_H * 0.12,
  },
  sparkle: {
    position: "absolute",
    fontWeight: "900",
  },
  hGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: SCREEN_H * 0.32,
    height: 140,
    opacity: 0.75,
  },
  boxTeaser: {
    position: "absolute",
    top: SCREEN_H * 0.22,
    alignItems: "center",
    gap: 8,
  },
  boxImage: {
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  boxTeaserLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardOuter: {
    marginTop: SCREEN_H * 0.18,
    alignItems: "center",
    zIndex: revealLayerZIndex.card,
    elevation: 16,
  },
  cardBorder: {
    borderRadius: 24,
    padding: 2,
  },
  card: {
    width: CARD_W - 4,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  chargeRingHost: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
  },
  mysteryWrap: {
    position: "absolute",
    alignSelf: "center",
    top: 20,
  },
  mysteryFrame: {
    width: PRIZE_IMG,
    height: PRIZE_IMG,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  mysteryIcon: {
    fontSize: 44,
    fontWeight: "900",
    color: "rgba(255,255,255,0.92)",
  },
  mysteryHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
  },
  prizeWrap: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  imageFrame: {
    width: PRIZE_IMG,
    height: PRIZE_IMG,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.bgSoft,
  },
  prizeImage: {
    width: PRIZE_IMG,
    height: PRIZE_IMG,
    borderRadius: 14,
  },
  prizePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  qualityBadgeWrap: {
    position: "absolute",
    right: 6,
    bottom: 6,
  },
  cardEmoji: { fontSize: 44, fontWeight: "900", letterSpacing: 2 },
  prizeName: {
    width: "100%",
    fontSize: 17,
    fontWeight: "900",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 22,
  },
  title: {
    marginTop: 22,
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    paddingHorizontal: 24,
    textAlign: "center",
  },
  ceremonyBanner: {
    position: "absolute",
    top: SCREEN_H * 0.12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    zIndex: 5,
  },
  ceremonyBannerText: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
  },
  ceremonySub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
  },
  chargeRing: {
    position: "absolute",
    width: PRIZE_IMG + 36,
    height: PRIZE_IMG + 36,
    borderRadius: (PRIZE_IMG + 36) / 2,
    borderWidth: 2.5,
    top: -18,
    alignSelf: "center",
  },
  hint: {
    position: "absolute",
    bottom: 48,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  pityBanner: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800",
    color: "#FFE082",
    textAlign: "center",
  },
  });
}
