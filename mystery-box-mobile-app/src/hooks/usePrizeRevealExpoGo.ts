/**
 * QUARANTINED — Expo Go lightweight reveal path (RN Animated, no Reanimated worklets).
 *
 * Do not import this hook from product UI. The sole selection gate is
 * `resolvePreferClassicRevealDriver` / `usePrizeReveal` in `./usePrizeReveal`.
 * Production and dev-client builds use the lazy Reanimated driver instead;
 * this module stays only so Expo Go (`Constants.appOwnership === "expo"`) can run.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vibration } from "react-native";
import type { Product } from "../types";
import { getEffectProfile } from "../effects/config";
import { resolveCeremonyTier, ceremonyTierToDisplayQuality } from "../effects/ceremonyTier";
import { getEffectProfileWithBoost } from "../effects/intensity";
import { applyRemoteRevealProfile, getRevealRemoteConfig, type ReduceMotionLevel } from "../effects/revealRemote";
import { applyRevealTheme, resolveRevealTheme } from "../effects/revealTheme";
import { resolveActiveRevealThemeId, rollSurpriseThemeId } from "../effects/revealThemeRotation";
import type { RevealPacing } from "../effects/revealSequence";
import {
  cancelScheduledRevealSoundTimers,
  cancelScheduledRevealSounds,
  playRevealSoundArc,
  setRuntimeThemeSoundBankFromTheme,
  warmupTierSounds,
} from "../effects/sound";
import { getExpoRevealTimeline } from "../effects/expoRevealTiming";
import { getStepIdleMs, resolveHoldDuration, scaleRevealDuration } from "../effects/revealTiming";
import { trackEffectEvent } from "../effects/telemetry";
import {
  accelerateDurationScale,
  resolveAccelerateTier,
  resolveSkipGuardTier,
  resolveSkipTapAction,
} from "../effects/revealSkipPolicy";
import { playAccelerateHapticPulse } from "../effects/revealHaptics";
import { queueRevealA11yAnnounce } from "../effects/revealA11yAnnounce";
import { resolveAccelerateSpeedLabel } from "../effects/revealTouchPolicy";
import type { RevealPlayState } from "../components/ui/RevealPlayStateIndicator";
import i18n from "../i18n";
import { normalizeQualityTier, qualityLabel } from "../utils/quality";

type Options = {
  products: Product[];
  lowPerfMode: boolean;
  reduceMotion: boolean;
  reduceMotionLevel?: ReduceMotionLevel;
  autoReplay: boolean;
  soundEnabled: boolean;
  revealIndex?: number;
  totalReveals?: number;
  showBoxTeaser?: boolean;
  teaserVariant?: "full" | "mini";
  pacing?: RevealPacing;
  drawProducts?: Product[];
  prizeName?: string;
  boxName?: string;
  boxCategoryName?: string;
  orderId?: string;
  isReplaySession?: boolean;
  onRevealComplete?: () => void;
};

/** Quarantined Expo Go driver — mounted only via the single gate in usePrizeReveal. */
export function usePrizeRevealExpoGo({
  products,
  reduceMotion,
  reduceMotionLevel = "medium",
  autoReplay,
  soundEnabled,
  revealIndex = 0,
  totalReveals = 1,
  showBoxTeaser = false,
  teaserVariant = "full",
  pacing = "normal",
  drawProducts,
  prizeName,
  boxName,
  boxCategoryName,
  orderId,
  isReplaySession = false,
  onRevealComplete,
}: Options) {
  const [showReveal, setShowReveal] = useState(false);
  const [revealPlayToken, setRevealPlayToken] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [accelerateProgress, setAccelerateProgress] = useState(0);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [activeAccelTier, setActiveAccelTier] = useState<0 | 1 | 2>(0);
  const playingRef = useRef(false);
  const accelerateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPlayRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipTapCountRef = useRef(0);
  const skipTapResetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const accelTierRef = useRef<0 | 1 | 2>(0);

  const tier = useMemo(() => {
    const product = products[0];
    if (!product) return resolveCeremonyTier({ id: "", name: "", price: 0 } as Product, drawProducts);
    return resolveCeremonyTier(product, drawProducts ?? products);
  }, [products, drawProducts]);
  const surpriseThemeId = useMemo(() => {
    void orderId;
    return rollSurpriseThemeId();
  }, [orderId]);
  const revealTheme = useMemo(
    () =>
      resolveRevealTheme({
        boxName,
        categoryName: boxCategoryName,
        remoteThemeId: resolveActiveRevealThemeId({
          surpriseThemeId,
        }),
      }),
    [boxName, boxCategoryName, surpriseThemeId],
  );
  useEffect(() => {
    setRuntimeThemeSoundBankFromTheme(revealTheme.id);
  }, [revealTheme.id]);
  const profile = useMemo(() => {
    const opts = { reduceMotion: false, lowPerf: false };
    const base =
      totalReveals > 1
        ? getEffectProfileWithBoost(tier, revealIndex, totalReveals, opts)
        : getEffectProfile(tier, opts);
    const scaled = applyRevealTheme(applyRemoteRevealProfile(base), revealTheme);
    if (reduceMotion) {
      return {
        ...scaled,
        particleCount: Math.min(12, scaled.particleCount),
        confettiCount: Math.min(8, scaled.confettiCount),
        rayCount: Math.min(6, scaled.rayCount),
      };
    }
    return scaled;
  }, [tier, reduceMotion, revealIndex, totalReveals, revealTheme]);

  useEffect(() => {
    warmupTierSounds().catch(() => undefined);
  }, []);

  const finishReveal = useCallback(() => {
    playingRef.current = false;
    setShowReveal(false);
    const product = products[0];
    const displayTier = product?.qualityType
      ? normalizeQualityTier(product.qualityType)
      : ceremonyTierToDisplayQuality(tier);
    const label = qualityLabel(displayTier, i18n.t.bind(i18n));
    const msg = prizeName
      ? i18n.t("revealA11y.gotPrize", { tier: label, name: prizeName })
      : i18n.t("revealA11y.gotPrizeNoName", { tier: label });
    queueRevealA11yAnnounce(msg);
    onRevealComplete?.();
  }, [onRevealComplete, prizeName, products, tier]);

  const stopAll = useCallback((hard = false) => {
    playingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (hard) {
      cancelScheduledRevealSounds({ fadeMs: 0 });
    } else {
      cancelScheduledRevealSoundTimers();
    }
    Vibration.cancel();
  }, []);

  const triggerReveal = useCallback(
    (forcePacing?: RevealPacing, bypassThrottle = false) => {
      if (products.length === 0) return;
      const effectivePacing = forcePacing ?? pacing;
      const now = Date.now();
      const throttle = effectivePacing === "fast" ? 380 : 900;
      const inMultiSequence = totalReveals > 1;
      if (!bypassThrottle && !inMultiSequence && now - lastPlayRef.current < throttle) return;
      lastPlayRef.current = now;

      stopAll(false);
      setRevealPlayToken((token) => token + 1);
      setShowReveal(true);
      playingRef.current = true;
      if (forcePacing !== "fast") {
        accelTierRef.current = 0;
        setActiveAccelTier(0);
      }

      trackEffectEvent("reveal_play", {
        tier,
        productCount: products.length,
        revealIndex,
        totalReveals,
        pacing: effectivePacing,
        driver: "expo-go",
      });

      const accelTier = accelTierRef.current;
      const timeline = getExpoRevealTimeline(effectivePacing, {
        showBoxTeaser,
        reduceMotion,
        ceremony: tier,
        teaserVariant,
        revealIndex,
        totalReveals,
        accelerateScale: accelerateDurationScale(accelTier),
        orderId,
      });

      const timingOpts = {
        reduceMotion,
        lowPerf: false,
        revealIndex,
        totalReveals,
        orderId,
        accelerateScale: accelerateDurationScale(accelTierRef.current),
      };
      const isFinaleDraw = revealIndex >= totalReveals - 1 && totalReveals > 1;
      playRevealSoundArc({
        tier,
        revealIndex,
        totalReveals,
        pacing: effectivePacing,
        isFinaleDraw,
        soundEnabled,
        afterBoxTeaser: showBoxTeaser,
        chargeMs: scaleRevealDuration(profile.chargeMs, effectivePacing, timingOpts),
        accelerateTier: accelTier,
        themeId: revealTheme.id,
      });
      if (!reduceMotion) {
        Vibration.vibrate(profile.vibrationPattern);
      }
      const holdMs = resolveHoldDuration(
        effectivePacing,
        profile,
        { ...timingOpts, totalReveals, revealIndex },
        getRevealRemoteConfig().finaleHoldMsExtra,
      );
      const stepIdleMs = getStepIdleMs(profile, effectivePacing, timingOpts);
      const burstDelay = showBoxTeaser ? Math.round(stepIdleMs * 0.08) : Math.round(stepIdleMs * 0.16);
      const hasMoreInSequence = totalReveals > 1 && revealIndex < totalReveals - 1;
      const prizeDwellMs = hasMoreInSequence
        ? effectivePacing === "fast"
          ? 380
          : effectivePacing === "normal"
            ? 620
            : 760
        : effectivePacing === "finale" || effectivePacing === "ceremony"
          ? 980
          : 520;
      const totalMs = timeline.totalMs + holdMs + burstDelay + prizeDwellMs;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        finishReveal();
      }, totalMs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [
      products.length,
      pacing,
      stopAll,
      reduceMotion,
      tier,
      profile,
    revealIndex,
    totalReveals,
    showBoxTeaser,
    teaserVariant,
    soundEnabled,
    finishReveal,
    orderId,
  ],
  );

  const clearAccelerateTimer = useCallback(() => {
    if (accelerateTimerRef.current) {
      clearInterval(accelerateTimerRef.current);
      accelerateTimerRef.current = null;
    }
  }, []);

  const accelerateReveal = useCallback(
    (isLongPress = false) => {
      if (!showReveal || isPaused) return;
      const accelTier = resolveAccelerateTier(isLongPress);
      accelTierRef.current = accelTier;
      setActiveAccelTier(accelTier);
      playAccelerateHapticPulse(accelTier);
      trackEffectEvent(`reveal_accelerate_tier${accelTier}`, {
        tier,
        driver: "expo-go",
        orderId,
        revealIndex,
      });
      clearAccelerateTimer();
      setAccelerateProgress(0);
      setIsAccelerating(false);
      stopAll(true);
      triggerReveal("fast", true);
    },
    [showReveal, isPaused, stopAll, triggerReveal, tier, orderId, revealIndex, clearAccelerateTimer],
  );

  const handleAcceleratePressIn = useCallback(() => {
    if (!showReveal || isPaused) return;
    clearAccelerateTimer();
    setIsAccelerating(true);
    setActiveAccelTier(1);
    const startedAt = Date.now();
    accelerateTimerRef.current = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / 280);
      setAccelerateProgress(progress);
      if (progress >= 0.55) {
        setActiveAccelTier(2);
        accelTierRef.current = 2;
        playAccelerateHapticPulse(2);
      }
      if (progress >= 1) {
        clearAccelerateTimer();
        setIsAccelerating(false);
        setAccelerateProgress(0);
        accelerateReveal(true);
      }
    }, 40);
  }, [showReveal, isPaused, clearAccelerateTimer, accelerateReveal]);

  const handleAcceleratePressOut = useCallback(() => {
    clearAccelerateTimer();
    setIsAccelerating(false);
    setAccelerateProgress(0);
    setActiveAccelTier(0);
  }, [clearAccelerateTimer]);

  const skipReveal = useCallback(
    (reason: "skip_one" | "skip_remaining" = "skip_one") => {
      trackEffectEvent(reason === "skip_remaining" ? "reveal_skip_remaining" : "reveal_skip_one", {
        tier,
        reason,
        revealIndex,
        totalReveals,
        driver: "expo-go",
        orderId,
        wasPausedBeforeSkip: isPaused,
      });
      setIsPaused(false);
      stopAll(true);
      setShowReveal(false);
      onRevealComplete?.();
    },
    [stopAll, tier, revealIndex, totalReveals, onRevealComplete, orderId, isPaused],
  );

  const handleSkipPress = useCallback(
    (isLongPress = false) => {
      skipTapCountRef.current += 1;
      if (skipTapResetRef.current) clearTimeout(skipTapResetRef.current);
      skipTapResetRef.current = setTimeout(() => {
        skipTapCountRef.current = 0;
      }, 450);
      const guardTier = resolveSkipGuardTier(tier, pacing);
      const action = resolveSkipTapAction(
        guardTier,
        isPaused,
        isLongPress,
        skipTapCountRef.current,
      );
      if (action.action === "pause") {
        setIsPaused(true);
        playingRef.current = false;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        cancelScheduledRevealSounds();
        trackEffectEvent("reveal_pause", { orderId, revealIndex, tier });
        return;
      }
      skipReveal("skip_one");
    },
    [tier, pacing, isPaused, skipReveal, orderId, revealIndex],
  );

  useEffect(() => {
    if (autoReplay) triggerReveal();
  }, [products.length, tier, autoReplay, triggerReveal]);

  useEffect(() => {
    return () => {
      stopAll();
      clearAccelerateTimer();
    };
  }, [stopAll, clearAccelerateTimer]);

  return {
    motionDriver: "expo-go" as const,
    showReveal,
    revealPlayToken,
    tier,
    profile,
    revealTheme,
    teaserVariant,
    accelerateProgress,
    isAccelerating,
    accelerateSpeedLabel: resolveAccelerateSpeedLabel(isAccelerating, accelerateProgress, activeAccelTier),
    revealPlayState: (!showReveal
      ? "idle"
      : isPaused
        ? "paused"
        : isAccelerating
          ? "accelerating"
          : isReplaySession
            ? "replaying"
            : "playing") as RevealPlayState,
    triggerReveal: (forcePacing?: RevealPacing, bypassThrottle?: boolean) =>
      triggerReveal(forcePacing, bypassThrottle ?? false),
    accelerateReveal,
    handleAcceleratePressIn,
    handleAcceleratePressOut,
    skipReveal,
    handleSkipPress,
  };
}
