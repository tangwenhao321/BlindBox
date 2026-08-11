import { useEffect, useMemo, useState, useCallback } from "react";
import { Dimensions, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import type { EffectProfile, PrizeTier } from "../../effects/config";
import {
  isPremiumCeremony,
  isUltimateCeremony,
  normalizeCeremonyTier,
  type CeremonyTier,
} from "../../effects/ceremonyTier";
import { buildBurstParticles } from "../../effects/burstParticles";
import { pickLustreColor, lustreGradientStops, tintLustrePalette } from "../../effects/lustrePalette";
import { getAtmosphereOverrides } from "../../effects/revealAtmosphereRuntime";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";
import { resolveThemedLustre, themeConfettiColors, type RevealTheme } from "../../effects/revealTheme";
import { resolveLustreIntensity, shouldReduceLustreMotion, getRevealRemoteConfig } from "../../effects/revealRemote";
import { useRevealLayout } from "../../hooks/useRevealLayout";
import { shouldSkipParticles, shouldSkipTeaser } from "../../effects/revealA11yTheme";
import type { ReduceMotionLevel } from "../../effects/revealRemote";
import { getRuntimeRevealFlashEnabled } from "../../utils/revealSettings";
import { isRegionVisualBlocked } from "../../effects/revealRegionCompliance";
import { useAppTheme } from "../../context/ThemeContext";
import { effectProfileTierLabel, effectProfileTitle } from "../../utils/effectProfileI18n";
import { BoxRevealTeaser } from "./BoxRevealTeaser";
import { RevealCinematicIntro } from "./RevealCinematicIntro";
import { LustreGradientRing, RevealLustreLayers } from "./RevealLustreLayers";

import { RevealPrizeCard } from "./RevealPrizeCard";
import { RevealAccelerateRing } from "./RevealAccelerateRing";
import { RevealAccelerateBadge } from "./RevealAccelerateBadge";
import { RevealRareWatermark } from "./RevealRareWatermark";
import { ConfettiLayer } from "./ConfettiLayer";
import type { RevealPacing } from "../../effects/revealSequence";
import {
  isFullScreenSkipAllowed,
  resolveRevealTouchPhase,
  resolveTouchGuardTier,
  shouldShowRareWatermark,
  type RevealTouchPhase,
} from "../../effects/revealTouchPolicy";
import { OptionalLottieBurst } from "./OptionalLottieBurst";
import { BurstParticle } from "./BurstParticle";
import { trackEffectEvent } from "../../effects/telemetry";
import { REVEAL_TELEMETRY_EVENTS } from "../../effects/revealTelemetrySchema";
import { resolveRevealBreathPeriodMs, scaleBreathDurationMs } from "../../effects/revealSkipPolicy";
import { buildChargeTensionDurations, chargeSegmentEasing } from "../../effects/revealChargeCurve";
import { rnSpring } from "../../effects/reanimated/springConfig";
import { resolveRevealEffectPreset } from "../../effects/revealEffectPreset";
import { getRuntimeRevealEffectPresetId } from "../../utils/revealSettings";
import { resolveSessionFatigueScale } from "../../effects/revealSessionFatigue";
import { resolveRevealAssetParticleScale } from "../../effects/revealAssetManager";
import { getRuntimeRevealA11yGesturesEnabled } from "../../utils/revealSettings";
import { RemoteImage } from "./RemoteImage";
import { resolveBackdropDimAlpha } from "../../effects/revealAmbientLight";
import { resolveRecordingSafeRevealFlags, startRevealRecordingMonitor } from "../../effects/revealRecordingMode";
import { isRevealModalIsolated } from "../../hooks/useRevealLifecycle";
import { RevealTouchRipple } from "./RevealTouchRipple";
import { resolveCeremonyTemplateVisualScale } from "../../effects/revealCeremonyTemplate";
import { resolveEffectiveCeremonyTemplateId } from "../../effects/revealCeremonyTemplateAuto";
import { resolveNetworkTierParticleScale } from "../../effects/revealNetworkTier";
import { resolveWeakNetworkParticleScale } from "../../effects/revealWeakNetwork";
import { resolveActiveEmotionProfile } from "../../effects/revealEmotionProfiles";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Props = {
  visible: boolean;
  tier: string;
  profile: EffectProfile;
  revealTheme?: RevealTheme;
  revealOpacity: SharedValue<number>;
  revealScale: SharedValue<number>;
  titlePunch: SharedValue<number>;
  rainProgress: SharedValue<number>;
  confettiProgress: SharedValue<number>;
  flashOpacity: SharedValue<number>;
  shakeX: SharedValue<number>;
  prizeCardScale?: SharedValue<number>;
  prizeCardOpacity?: SharedValue<number>;
  cardFlip?: SharedValue<number>;
  boxTeaserOpacity?: SharedValue<number>;
  subtitle?: string;
  prizeName?: string;
  prizeImageUri?: string;
  prizeQualityType?: string;
  boxCoverUri?: string;
  boxId?: string;
  showBoxTeaser?: boolean;
  teaserVariant?: "full" | "mini";
  fullScreen?: boolean;
  reduceMotion?: boolean;
  reduceMotionLevel?: ReduceMotionLevel;
  degradeLevel?: number;
  skipParticles?: boolean;
  skipTeaserAnim?: boolean;
  accelerateProgress?: number;
  isAccelerating?: boolean;
  accelerateSpeedLabel?: "1.5x" | "2.5x" | null;
  pacing?: RevealPacing;
  onAcceleratePressIn?: () => void;
  onAcceleratePressOut?: () => void;
  collectionEasterEgg?: boolean;
  revealIndex?: number;
  totalReveals?: number;
  onPressSkip?: () => void;
  onLongPressAccelerate?: () => void;
  a11yFlashScale?: number;
  a11yLustreScale?: number;
  atmosphereParticleScale?: number;
};

function tierAccent(tier: CeremonyTier, brand: string, warning: string) {
  if (tier === "TREASURE_PEERLESS") return "#E0C48A";
  if (tier === "PEERLESS") return "#D4A060";
  if (tier === "TREASURE_LEGEND") return warning;
  if (tier === "HIDDEN") return "#C4A574";
  return brand;
}

export function OpenBoxRevealOverlay({

  visible,
  tier,
  profile,
  revealTheme,
  revealOpacity,
  revealScale,
  titlePunch,
  rainProgress,
  confettiProgress,
  flashOpacity,
  shakeX,
  prizeCardScale,
  prizeCardOpacity,
  cardFlip,
  boxTeaserOpacity,
  subtitle,
  prizeName,
  prizeImageUri,
  prizeQualityType,
  boxCoverUri,
  boxId,
  showBoxTeaser = false,
  teaserVariant = "full",
  fullScreen = true,
  reduceMotion = false,
  reduceMotionLevel = "medium",
  degradeLevel = 0,
  skipParticles: skipParticlesProp,
  skipTeaserAnim: skipTeaserAnimProp,
  accelerateProgress = 0,
  isAccelerating = false,
  accelerateSpeedLabel = null,
  pacing = "normal",
  onAcceleratePressIn,
  onAcceleratePressOut,
  collectionEasterEgg = false,
  revealIndex = 0,
  totalReveals = 1,
  onPressSkip,
  onLongPressAccelerate,
  a11yFlashScale = 1,
  a11yLustreScale = 1,
  atmosphereParticleScale = 1,
}: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const layout = useRevealLayout();
  const { width: winW, height: winH } = useWindowDimensions();
  const [touchPhase, setTouchPhase] = useState<RevealTouchPhase>("precharge");
  const bounceScale = useSharedValue(1);
  const [ambientTapCount, setAmbientTapCount] = useState(0);
  const [touchRippleTrigger, setTouchRippleTrigger] = useState(0);
  const recordingFlags = resolveRecordingSafeRevealFlags();
  const templateVisual = resolveCeremonyTemplateVisualScale(resolveEffectiveCeremonyTemplateId());
  const emotionParticleScale = resolveActiveEmotionProfile().particleScale;
  const atmosphere = getAtmosphereOverrides();
  const particleScale =
    resolveRevealAssetParticleScale(degradeLevel) *
    resolveNetworkTierParticleScale() *
    resolveWeakNetworkParticleScale() *
    templateVisual.particleScale *
    emotionParticleScale *
    atmosphereParticleScale;
  const modalIsolated = isRevealModalIsolated();

  useEffect(() => {
    const stop = startRevealRecordingMonitor();
    return stop;
  }, []);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  const isTablet = winW >= 600;
  const raySpin = useSharedValue(0);
  const haloPulse = useSharedValue(0);
  const chargeRing = useSharedValue(0);
  const effectTier = normalizeCeremonyTier(tier);
  const effectPreset = resolveRevealEffectPreset(getRuntimeRevealEffectPresetId());
  const lustre = useMemo(() => {
    let palette = resolveThemedLustre(effectTier, revealTheme, boxId);
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
    effectTier,
    revealTheme,
    boxId,
    effectPreset.lustrePaletteId,
    atmosphere.lustreTintAccent,
    atmosphere.lustreTintStrength,
  ]);
  const isCeremony = isPremiumCeremony(effectTier);
  const isUltimate = isUltimateCeremony(effectTier);
  const guardTier = useMemo(() => resolveTouchGuardTier(effectTier, pacing), [effectTier, pacing]);

  const applyTouchPhase = useCallback(
    (flip: number, flash: number) => {
      setTouchPhase(resolveRevealTouchPhase(flip, guardTier, flash));
    },
    [guardTier],
  );

  useAnimatedReaction(
    () => ({
      flip: cardFlip?.value ?? 0,
      flash: flashOpacity.value,
    }),
    (v) => {
      runOnJS(applyTouchPhase)(v.flip, v.flash);
    },
    [applyTouchPhase],
  );

  const allowFullScreenSkip =
    getRuntimeRevealA11yGesturesEnabled() || isFullScreenSkipAllowed(touchPhase);
  const lustreIntensity =
    resolveLustreIntensity(
      isUltimate ? 1 : isCeremony ? 0.82 : effectTier === "HIDDEN" ? 0.58 : 0.42,
    ) * a11yLustreScale;
  const displayTier = tier as PrizeTier;
  const remoteCfg = getRevealRemoteConfig();
  const handleGuardedTap = useCallback(() => {
    trackEffectEvent(REVEAL_TELEMETRY_EVENTS.guardedTap);
  }, []);
  const bumpAmbientFeedback = useCallback(() => {
    setTouchRippleTrigger((v) => v + 1);
    if (remoteCfg.ambientTapParticlesEnabled) {
      setAmbientTapCount((c) => (c + 1) % 8);
    }
    bounceScale.value = withSequence(
      withSpring(0.985, rnSpring(8, 200)),
      withSpring(1, rnSpring(6, 120)),
    );
  }, [remoteCfg.ambientTapParticlesEnabled, bounceScale]);
  const tierFlags = remoteCfg.tierElementFlags?.[effectTier] ?? {};
  const skipParticles = skipParticlesProp ?? shouldSkipParticles(reduceMotionLevel, degradeLevel);
  const skipTeaserAnim = skipTeaserAnimProp ?? shouldSkipTeaser(reduceMotionLevel, degradeLevel);
  const fatigueScale = resolveSessionFatigueScale();
  const scaledParticleCount = Math.max(
    0,
    Math.round(
      resolveRevealAssetParticleScale(
        profile.particleCount *
          layout.effectScale *
          fatigueScale *
          effectPreset.particleScale *
          particleScale,
      ),
    ),
  );
  const cardBreathMs = Math.round(resolveRevealBreathPeriodMs(effectTier) * fatigueScale);
  const showParticles =
    tierFlags.particles !== false && !skipParticles && !recordingFlags.reduceParticles && scaledParticleCount > 0;
  const showConfetti = tierFlags.confetti !== false && profile.confettiCount > 0;
  const showGoldFoil = tierFlags.goldFoil !== false && isUltimate;
  const effectiveShowTeaser = showBoxTeaser && !skipTeaserAnim;
  const particles = useMemo(
    () =>
      buildBurstParticles(
        scaledParticleCount,
        atmosphere.particleBias ?? revealTheme?.particleBias ?? "mixed",
      ),
    [scaledParticleCount, revealTheme?.particleBias, atmosphere.particleBias],
  );

  const accelTier: 0 | 1 | 2 =
    accelerateSpeedLabel === "2.5x" ? 2 : accelerateSpeedLabel === "1.5x" || isAccelerating ? 1 : 0;
  const breathHalfMs = Math.round(resolveRevealBreathPeriodMs(effectTier) / 2);

  useEffect(() => {
    if (!visible || profile.rayCount === 0) {
      cancelAnimation(raySpin);
      return;
    }
    raySpin.value = 0;
    const rayBase = isUltimate ? 5200 : isCeremony ? 6200 : effectTier === "HIDDEN" ? 8200 : 9000;
    const rayMs = scaleBreathDurationMs(rayBase, accelTier);
    raySpin.value = withRepeat(
      withTiming(1, { duration: rayMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(raySpin);
  }, [visible, effectTier, isCeremony, isUltimate, raySpin, profile.rayCount, accelTier]);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(haloPulse);
      cancelAnimation(chargeRing);
      return;
    }
    haloPulse.value = 0;
    const haloMs = scaleBreathDurationMs(breathHalfMs, accelTier);
    haloPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: haloMs }),
        withTiming(0, { duration: haloMs }),
      ),
      -1,
      false,
    );
    if (profile.chargeMs > 0 && (isCeremony || effectTier === "HIDDEN") && !reduceMotion) {
      chargeRing.value = 0;
      const chargeMs = scaleBreathDurationMs(520, accelTier);
      const segments = buildChargeTensionDurations(chargeMs, pacing);
      if (segments.loop) {
        chargeRing.value = withRepeat(
          withSequence(
            withTiming(1, { duration: segments.slowMs, easing: chargeSegmentEasing(pacing, "slow") }),
            withTiming(0.35, { duration: segments.accelMs, easing: chargeSegmentEasing(pacing, "accel") }),
          ),
          -1,
          false,
        );
      } else {
        chargeRing.value = withSequence(
          withTiming(0.55, { duration: segments.slowMs, easing: chargeSegmentEasing(pacing, "slow") }),
          withTiming(1, { duration: segments.accelMs, easing: chargeSegmentEasing(pacing, "accel") }),
          withTiming(0.98, { duration: segments.stallMs, easing: chargeSegmentEasing(pacing, "stall") }),
          withTiming(0.35, { duration: Math.max(40, Math.round(segments.accelMs * 0.35)) }),
        );
      }
    } else {
      chargeRing.value = 0;
    }
    return () => {
      cancelAnimation(haloPulse);
      cancelAnimation(chargeRing);
    };
  }, [visible, haloPulse, chargeRing, profile.chargeMs, isCeremony, reduceMotion, breathHalfMs, accelTier, pacing, effectTier]);

  const shakeStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
    transform: [{ translateX: shakeX.value }, { scale: revealScale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity:
      flashOpacity.value *
      (recordingFlags.reduceFlash ? 0.45 : 1) *
      templateVisual.flashScale *
      a11yFlashScale,
  }));

  const backdropBaseAlpha = useMemo(
    () => resolveBackdropDimAlpha({ touchPhaseGuarded: touchPhase === "guarded" }),
    [touchPhase],
  );

  const backdropDimStyle = useAnimatedStyle(() => ({
    opacity: resolveBackdropDimAlpha({ flashOpacity: flashOpacity.value, baseAlpha: backdropBaseAlpha }),
  }));

  const rayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: interpolate(raySpin.value, [0, 1], [0, 360]) + "deg" }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(haloPulse.value, [0, 1], [0.45, 0.9]),
    transform: [{ scale: interpolate(haloPulse.value, [0, 1], [1, 1.35]) }],
  }));

  const chargeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(chargeRing.value, [0, 1], [0.35, 1]),
    transform: [{ scale: interpolate(chargeRing.value, [0, 1], [0.88, 1.14]) }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titlePunch.value }],
    opacity: cardFlip ? interpolate(cardFlip.value, [0, 0.65, 1], [0, 0, 1]) : 1,
  }));

  const tierChipStyle = useAnimatedStyle(() => ({
    opacity: cardFlip ? interpolate(cardFlip.value, [0, 0.65, 1], [0, 0, 1]) : 1,
  }));

  const chargeHintStyle = useAnimatedStyle(() => ({
    opacity: cardFlip ? interpolate(cardFlip.value, [0, 0.45, 0.65], [1, 0.35, 0]) : 0,
  }));

  const subtitleRevealStyle = useAnimatedStyle(() => ({
    opacity: cardFlip ? interpolate(cardFlip.value, [0, 0.65, 1], [0, 0, 1]) : 1,
  }));

  const accent = tierAccent(effectTier, colors.brand, colors.warning);
  const fontScale = layout.splitScale * (layout.carMode ? 0.92 : 1);
  const confettiPalette = useMemo(() => {
    const themed = revealTheme ? themeConfettiColors(revealTheme, accent) : [];
    return [...lustre.sparkles, ...themed];
  }, [revealTheme, accent, lustre]);

  if (!visible) return null;

  const lustreMotion = shouldReduceLustreMotion(reduceMotion);
  const hostStyle = fullScreen ? styles.fullScreenHost : styles.host;
  const displaySubtitle = subtitle ?? t("orderResult.revealSuccessSubtitle");


  const inner = (
    <Animated.View style={[styles.shakeWrap, shakeStyle]}>
      <LinearGradient
        colors={["#07060ef2", "#12101cf0", "#07060ef2"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdropDim, backdropDimStyle]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.025)", "transparent", "rgba(120,100,255,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.backdropGrain]}
        pointerEvents="none"
      />
      {remoteCfg.atmosphereBuffEnabled && !layout.carMode ? (
        <LinearGradient
          colors={[`${accent}66`, "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.atmosphereRibbon}
          pointerEvents="none"
          accessibilityLabel={t("revealOverlay.atmosphereRibbonA11y")}
        />
      ) : null}
      {touchPhase === "precharge" && profile.chargeMs > 0 && !reduceMotion ? (
        <View style={styles.decorPattern} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={`decor-${i}`}
              style={[
                styles.decorLine,
                { transform: [{ rotate: `${i * 30}deg` }], opacity: 0.04 + (i % 2) * 0.02 },
              ]}
            />
          ))}
        </View>
      ) : null}
      <RevealRareWatermark visible={shouldShowRareWatermark(effectTier)} />
      <RevealLustreLayers
        visible={visible}
        tier={tier}
        reduceMotion={lustreMotion}
        intensity={lustreIntensity}
        palette={lustre}
      />
      <RevealCinematicIntro visible={visible} tier={tier} accent={accent} reduceMotion={lustreMotion} />
      <Animated.View style={[styles.flash, flashStyle]}>
        {!reduceMotion &&
        getRuntimeRevealFlashEnabled() &&
        !isRegionVisualBlocked(i18n.language, "flash_intense") ? (
          <>
            <LinearGradient
              colors={lustreGradientStops(lustre.flashTint)}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.55)"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              locations={[0, 0.45, 1]}
            />
          </>
        ) : null}
      </Animated.View>

      <View style={styles.particleLayerHost} renderToHardwareTextureAndroid pointerEvents="none">
        <ConfettiLayer
          progress={confettiProgress}
          count={showConfetti ? profile.confettiCount : 0}
          accentColor={accent}
          colorPalette={confettiPalette}
        />
        {visible && showParticles ? (
          <OptionalLottieBurst tier={displayTier} visible={visible} reduceMotion={reduceMotion} lustreRim={lustre.rim} />
        ) : null}
        {particles.map((p) => (
          <BurstParticle key={`burst-${p.id}`} progress={rainProgress} particle={p} colors={lustre.sparkles} />
        ))}
      </View>

      {profile.rayCount > 0 ? (
        <Animated.View style={[styles.raysHost, rayStyle]}>
          {Array.from({ length: profile.rayCount }).map((_, i) => (
            <View
              key={`ray-${i}`}
              style={[
                styles.ray,
                {
                  backgroundColor: pickLustreColor(lustre, "rays", i),
                  opacity: 0.14 + (i % 3) * 0.06,
                  transform: [{ rotate: `${(360 / profile.rayCount) * i}deg` }],
                },
              ]}
            />
          ))}
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.haloWrap, haloStyle]}>
        <LinearGradient colors={lustreGradientStops(lustre.halo)} style={styles.haloGrad} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} />
        <View style={[styles.haloCore, { borderColor: pickLustreColor(lustre, "rim", 0) }]} />
      </Animated.View>

      {(isCeremony || effectTier === "HIDDEN") && profile.chargeMs > 0 && !reduceMotion ? (
        <Animated.View style={[styles.chargeRingHost, chargeStyle]}>
          <LustreGradientRing size={SCREEN_W * 0.68} colors={lustre.rim} borderWidth={3} innerOpacity={0.78} />
        </Animated.View>
      ) : null}

      {isUltimate && !reduceMotion && showGoldFoil ? (
        <View style={styles.rimGlowHost} pointerEvents="none">
          <LustreGradientRing size={SCREEN_W * 0.78} colors={lustre.rim} borderWidth={2} innerOpacity={0.92} />
        </View>
      ) : null}

      {effectiveShowTeaser && boxTeaserOpacity ? (
        <BoxRevealTeaser
          visible={visible}
          boxCoverUri={boxCoverUri}
          teaserOpacity={boxTeaserOpacity}
          accentColor={accent}
          variant={teaserVariant}
          boxTapEnabled={remoteCfg.boxTapInteractionEnabled}
        />
      ) : null}

      {prizeCardScale && prizeCardOpacity && cardFlip ? (
        <RevealPrizeCard
          key={prizeImageUri ?? prizeName ?? "reveal-prize"}
          imageUri={prizeImageUri}
          prizeName={prizeName}
          qualityType={prizeQualityType}
          scale={prizeCardScale}
          opacity={prizeCardOpacity}
          cardFlip={cardFlip}
          accentColor={accent}
          tier={displayTier}
          lustreRim={lustre.rim}
          reduceMotion={lustreMotion}
          breathPeriodMs={cardBreathMs}
          revealIndex={revealIndex}
        />
      ) : null}

      <View
        style={[
          styles.content,
          {
            marginTop: Math.max(
              winH * (layout.carMode ? 0.12 : isTablet ? 0.2 : 0.28),
              layout.overlayChromeTop + (layout.carMode ? 8 : 24),
            ),
            maxWidth: isTablet ? Math.min(520, winW - 80) : winW - 48,
          },
        ]}
      >
        <Animated.View style={[styles.tierChipWrap, tierChipStyle]}>
          {remoteCfg.activeEventTagUri ? (
            <RemoteImage uri={remoteCfg.activeEventTagUri} style={styles.eventTag} contentFit="contain" />
          ) : null}
          <LinearGradient colors={lustreGradientStops([...lustre.rim.slice(0, 3), lustre.rim[0]])} style={styles.tierChipBorder}>
            <View style={styles.tierChipInner}>
              <Text style={[styles.tierChipText, { color: accent }]}>{effectProfileTierLabel(t, displayTier)}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
        <Animated.Text
          style={[
            styles.title,
            isTablet ? styles.titleTablet : null,
            { fontSize: Math.round((isTablet ? 36 : 32) * fontScale) },
            titleStyle,
          ]}
        >
          {effectProfileTitle(t, displayTier)}
        </Animated.Text>
        {cardFlip ? (
          <Animated.Text style={[styles.subtitle, chargeHintStyle, { fontSize: Math.round(14 * fontScale) }]}>
            {t("revealOverlay.suspenseCharging")}
          </Animated.Text>
        ) : null}
        <Animated.Text
          style={[
            styles.subtitle,
            { fontSize: Math.round(14 * fontScale) },
            cardFlip ? subtitleRevealStyle : undefined,
          ]}
        >
          {displaySubtitle}
        </Animated.Text>
        {onPressSkip ? (
          <Text style={styles.tapHint}>
            {allowFullScreenSkip ? t("revealOverlay.tapSkipAccelerate") : t("revealOverlay.tapSkipCornerOnly")}
          </Text>
        ) : null}
        {collectionEasterEgg ? (
          <Text style={styles.easterEggHint}>{t("revealOverlay.collectionEasterEgg")}</Text>
        ) : null}

      </View>
      <RevealTouchRipple trigger={touchRippleTrigger} color={`${accent}88`} />
      <RevealAccelerateRing visible={isAccelerating} progress={accelerateProgress} accentColor={accent} />
      <RevealAccelerateBadge visible={isAccelerating || !!accelerateSpeedLabel} label={accelerateSpeedLabel} />
    </Animated.View>
  );

  if (modalIsolated && !onPressSkip) {
    return (
      <View style={hostStyle} pointerEvents="none">
        {inner}
      </View>
    );
  }

  if (
    allowFullScreenSkip &&
    (onPressSkip || onLongPressAccelerate || onAcceleratePressIn)
  ) {
    return (
      <Pressable
        style={hostStyle}
        onPress={() => {
          bumpAmbientFeedback();
          onPressSkip?.();
        }}
        onLongPress={onLongPressAccelerate}
        onPressIn={() => {
          bumpAmbientFeedback();
          onAcceleratePressIn?.();
        }}
        onPressOut={onAcceleratePressOut}
        delayLongPress={280}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        accessibilityRole="button"
        accessibilityLabel={t("revealOverlay.skipOrAccelerateA11y")}
      >
        {inner}
      </Pressable>
    );
  }

  if (onPressSkip || onLongPressAccelerate) {
    return (
      <Pressable
        style={hostStyle}
        onPress={() => {
          bumpAmbientFeedback();
          if (!allowFullScreenSkip) {
            handleGuardedTap();
            return;
          }
          onPressSkip?.();
        }}
        onLongPress={allowFullScreenSkip ? onLongPressAccelerate : undefined}
        onPressIn={onAcceleratePressIn}
        onPressOut={onAcceleratePressOut}
        delayLongPress={280}
        accessibilityRole="button"
        accessibilityLabel={t("revealOverlay.skipOrAccelerateA11y")}
      >
        <Animated.View style={[{ flex: 1 }, bounceStyle]} pointerEvents="box-none">
          {inner}
          {ambientTapCount > 0 && remoteCfg.ambientTapParticlesEnabled ? (
            <View style={styles.ambientTapHost} pointerEvents="none">
              {Array.from({ length: 3 }).map((_, i) => (
                <View key={`tap-${ambientTapCount}-${i}`} style={[styles.ambientSpark, { left: `${30 + i * 20}%`, top: `${40 + i * 8}%` }]} />
              ))}
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={hostStyle} pointerEvents="none">
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenHost: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    zIndex: revealLayerZIndex.overlay,
    elevation: revealLayerZIndex.overlay,
  },
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  ambientTapHost: {
    ...StyleSheet.absoluteFillObject,
  },
  ambientSpark: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  shakeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backdropGrain: {
    opacity: 0.75,
  },
  backdropDim: {
    backgroundColor: "#000",
  },
  atmosphereRibbon: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Math.max(72, SCREEN_H * 0.12),
    zIndex: 2,
  },
  decorPattern: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  decorLine: {
    position: "absolute",
    width: SCREEN_W * 0.9,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  particleLayerHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 400,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
  },
  raysHost: {
    position: "absolute",
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  ray: {
    position: "absolute",
    width: 4,
    height: SCREEN_H * 0.55,
    top: SCREEN_H * 0.22,
    opacity: 0.22,
    borderRadius: 4,
  },
  haloWrap: {
    position: "absolute",
    width: 220,
    height: 220,
    top: SCREEN_H * 0.26,
    alignItems: "center",
    justifyContent: "center",
  },
  haloGrad: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 110,
    opacity: 0.85,
  },
  haloCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chargeRingHost: {
    position: "absolute",
    top: SCREEN_H * 0.24,
    alignItems: "center",
    justifyContent: "center",
  },
  rimGlowHost: {
    position: "absolute",
    top: SCREEN_H * 0.2,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.92,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  tierChipWrap: {
    marginBottom: 12,
    alignItems: "center",
    gap: 8,
  },
  eventTag: {
    width: 72,
    height: 22,
    marginBottom: 4,
  },
  tierChipBorder: {
    borderRadius: 999,
    padding: 1.5,
  },
  tierChipInner: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "rgba(8,8,16,0.72)",
  },
  tierChipText: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  titleTablet: {
    fontSize: 36,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 1.5,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  prizeName: {
    marginTop: 10,
    color: "rgba(255,255,255,0.95)",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  tapHint: {
    marginTop: 14,
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },
  easterEggHint: {
    marginTop: 6,
    color: "#FFD678",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
});
