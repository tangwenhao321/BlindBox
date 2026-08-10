import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Vibration } from "react-native";
import type { Product } from "../types";
import { getEffectProfile } from "../effects/config";
import { resolveCeremonyTier, isPremiumCeremony, isUltimateCeremony, ceremonyTierToDisplayQuality } from "../effects/ceremonyTier";
import { getEffectProfileWithBoost } from "../effects/intensity";
import { createRevealFrameMonitor } from "../effects/revealFrameMonitor";
import { isRevealRecordingSafeMode } from "../effects/revealRecordingMode";
import type { SharedValue } from "react-native-reanimated";
import {
  cancelAnimation,
  Easing,
  rnSpring,
  runOnJS,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  onAnimFinished,
} from "../effects/reanimated";
import { applyRemoteRevealProfile, getRevealRemoteConfig, type ReduceMotionLevel } from "../effects/revealRemote";
import { applyRevealTheme, resolveRevealTheme } from "../effects/revealTheme";
import type { RevealPacing } from "../effects/revealSequence";
import { cancelScheduledRevealSounds, playRevealSoundArc, playTierSoundSynced, warmupTierSounds } from "../effects/sound";
import { resolveHoldDuration, scaleRevealDuration, getStepIdleMs, resolveFlipSpringMs } from "../effects/revealTiming";
import { alignRevealPhaseStart } from "../effects/revealPhaseAlign";
import { healStuckRevealOverlay } from "../effects/revealRenderHeal";
import { markRevealPerformanceDegraded, getRevealDegradeLevel } from "../effects/sessionPerf";
import { trackEffectEvent } from "../effects/telemetry";
import { cancelRevealMotion, markRevealDrawActive, releaseRevealDraw } from "../effects/revealAssetManager";
import { resolvePhaseEasing } from "../effects/revealEasing";
import { resolveEffectVariance } from "../effects/revealEffectVariance";
import { lockRevealActions, lockRevealEndZone } from "../effects/revealActionLock";
import { queueRevealA11yAnnounce } from "../effects/revealA11yAnnounce";
import { shouldSkipShake } from "../effects/revealA11yTheme";
import {
  getRuntimeRevealShakeEnabled,
  getRuntimeRevealHapticEnabled,
} from "../utils/revealSettings";
import { accelerateDurationScale, resolveAccelerateTier, resolveSkipGuardTier, resolveSkipTapAction } from "../effects/revealSkipPolicy";
import { deriveSnapshotTags, saveRevealSnapshot } from "../effects/revealSnapshotCache";
import { checkFreeStorage } from "../effects/revealStorageGuard";
import { scheduleRevealGc } from "../effects/revealGcScheduler";
import { recordDailyFirstRevealStamp } from "../effects/revealCalendarStamps";
import {
  clearRevealInterruptSnapshot,
  saveRevealInterruptSnapshot,
} from "../effects/revealInterruptSnapshot";
import { createStepWatchdog } from "../effects/revealStepWatchdog";
import { touchRevealSeriesEasterEggActivity } from "../effects/revealSeriesEasterEgg";
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
  prizeImageUri?: string;
  isReplaySession?: boolean;
  hasAuth?: boolean;
  onRevealComplete?: () => void;
};

function runScreenShake(shakeX: SharedValue<number>, strong: boolean, stepScale = 1) {
  const steps = strong ? [14, -14, 10, -10, 7, -7, 0] : [8, -8, 5, -5, 0];
  shakeX.value = withSequence(
    ...steps.map((step) =>
      withTiming(step * stepScale, { duration: 40, easing: Easing.linear }),
    ),
  );
}

export function usePrizeRevealReanimated({
  products,
  lowPerfMode,
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
  prizeImageUri,
  isReplaySession = false,
  hasAuth = true,
  onRevealComplete,
}: Options) {
  const [showReveal, setShowReveal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [accelerateProgress, setAccelerateProgress] = useState(0);
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [activeAccelTier, setActiveAccelTier] = useState<0 | 1 | 2>(0);
  const revealOpacity = useSharedValue(0);
  const revealScale = useSharedValue(0.88);
  const titlePunch = useSharedValue(0.6);
  const rainProgress = useSharedValue(0);
  const confettiProgress = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const prizeCardScale = useSharedValue(0.9);
  const prizeCardOpacity = useSharedValue(0);
  const cardFlip = useSharedValue(0);
  const boxTeaserOpacity = useSharedValue(0);
  const lastPlayRef = useRef(0);
  const playingRef = useRef(false);
  const playbackSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forcePrizeRevealRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetKeyRef = useRef<string | null>(null);
  const skipTapCountRef = useRef(0);
  const skipTapResetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onWatchdogTimeoutRef = useRef<() => void>(() => undefined);
  const stepWatchdogRef = useRef(
    createStepWatchdog(45_000, () => {
      markRevealPerformanceDegraded();
      onWatchdogTimeoutRef.current();
    }),
  );
  const frameMonitor = useRef(
    createRevealFrameMonitor(
      undefined,
      () => {
        const key = assetKeyRef.current ?? orderId ?? "reveal";
        void healStuckRevealOverlay(key, [
          revealOpacity,
          flashOpacity,
          prizeCardOpacity,
          cardFlip,
        ]);
      },
      { slowFrameThresholdMs: isRevealRecordingSafeMode() ? 33 : 34 },
    ),
  ).current;
  const accelerateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const degradeLevel = getRevealDegradeLevel();
  const skipShakeMotion = shouldSkipShake(reduceMotionLevel, degradeLevel) || !getRuntimeRevealShakeEnabled();

  const tier = useMemo(() => {
    const product = products[0];
    if (!product) return resolveCeremonyTier({ id: "", name: "", price: 0 } as Product, drawProducts);
    return resolveCeremonyTier(product, drawProducts ?? products);
  }, [products, drawProducts]);
  const revealTheme = useMemo(
    () =>
      resolveRevealTheme({
        boxName,
        categoryName: boxCategoryName,
        remoteThemeId: getRevealRemoteConfig().themeId,
      }),
    [boxName, boxCategoryName],
  );
  const profile = useMemo(() => {
    const opts = { reduceMotion, lowPerf: lowPerfMode };
    const base =
      totalReveals > 1
        ? getEffectProfileWithBoost(tier, revealIndex, totalReveals, opts)
        : getEffectProfile(tier, opts);
    return applyRevealTheme(applyRemoteRevealProfile(base), revealTheme);
  }, [tier, reduceMotion, lowPerfMode, revealIndex, totalReveals, revealTheme]);

  const accelTierRef = useRef<0 | 1 | 2>(0);

  const timingOpts = useMemo(
    () => ({
      reduceMotion,
      lowPerf: lowPerfMode,
      totalReveals,
      revealIndex,
      orderId,
      accelerateScale: accelerateDurationScale(activeAccelTier),
    }),
    [reduceMotion, lowPerfMode, totalReveals, revealIndex, orderId, activeAccelTier],
  );

  useEffect(() => {
    warmupTierSounds().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!showReveal || reduceMotion) {
      frameMonitor.stop();
      return;
    }
    frameMonitor.start();
    return () => frameMonitor.stop();
  }, [showReveal, reduceMotion, frameMonitor]);

  const stopAll = useCallback(() => {
    playingRef.current = false;
    if (playbackSafetyRef.current) {
      clearTimeout(playbackSafetyRef.current);
      playbackSafetyRef.current = null;
    }
    if (forcePrizeRevealRef.current) {
      clearTimeout(forcePrizeRevealRef.current);
      forcePrizeRevealRef.current = null;
    }
    cancelAnimation(revealOpacity);
    cancelAnimation(revealScale);
    cancelAnimation(titlePunch);
    cancelAnimation(rainProgress);
    cancelAnimation(confettiProgress);
    cancelAnimation(flashOpacity);
    cancelAnimation(shakeX);
    cancelAnimation(prizeCardScale);
    cancelAnimation(prizeCardOpacity);
    cancelAnimation(cardFlip);
    cancelAnimation(boxTeaserOpacity);
    cancelScheduledRevealSounds({ fadeMs: getRevealRemoteConfig().audioFadeOutMs });
    Vibration.cancel();
  }, [
    boxTeaserOpacity,
    cardFlip,
    confettiProgress,
    flashOpacity,
    prizeCardOpacity,
    prizeCardScale,
    rainProgress,
    revealOpacity,
    revealScale,
    shakeX,
    titlePunch,
  ]);

  const finishReveal = useCallback(() => {
    stepWatchdogRef.current.disarm();
    lockRevealEndZone(200);
    playingRef.current = false;
    if (playbackSafetyRef.current) {
      clearTimeout(playbackSafetyRef.current);
      playbackSafetyRef.current = null;
    }
    if (forcePrizeRevealRef.current) {
      clearTimeout(forcePrizeRevealRef.current);
      forcePrizeRevealRef.current = null;
    }
    const hasMoreInSequence = totalReveals > 1 && revealIndex < totalReveals - 1;
    if (!hasMoreInSequence) {
      setShowReveal(false);
    }
    const product = products[0];
    const displayTier = product?.qualityType
      ? normalizeQualityTier(product.qualityType)
      : ceremonyTierToDisplayQuality(tier);
    const label = qualityLabel(displayTier, i18n.t.bind(i18n));
    const msg = prizeName
      ? i18n.t("revealA11y.gotPrize", { tier: label, name: prizeName })
      : i18n.t("revealA11y.gotPrizeNoName", { tier: label });
    queueRevealA11yAnnounce(msg);
    if (orderId && product?.id && isUltimateCeremony(tier)) {
      void checkFreeStorage().then((ok) => {
        if (!ok) return;
        void saveRevealSnapshot(
          {
            orderId,
            productId: product.id,
            productName: prizeName ?? product.name,
            imageUri: prizeImageUri,
            qualityType: product.qualityType,
            capturedAt: Date.now(),
            tags: deriveSnapshotTags(
              tier,
              (getRevealRemoteConfig().limitedThemePriority ?? 0) > 0,
              drawProducts?.[0]?.qualityType,
            ),
          },
          hasAuth,
        );
      });
    }
    if (orderId) {
      void recordDailyFirstRevealStamp(orderId);
      clearRevealInterruptSnapshot(orderId);
    }
    scheduleRevealGc("reveal_complete");
    if (assetKeyRef.current) {
      releaseRevealDraw(assetKeyRef.current);
      assetKeyRef.current = null;
    }
    onRevealComplete?.();
  }, [onRevealComplete, prizeName, prizeImageUri, products, tier, orderId, revealIndex, totalReveals]);

  useEffect(() => {
    onWatchdogTimeoutRef.current = finishReveal;
  }, [finishReveal]);

  const resetMotion = useCallback(() => {
    revealOpacity.value = 0;
    revealScale.value = 0.88;
    titlePunch.value = 0.6;
    rainProgress.value = 0;
    confettiProgress.value = 0;
    flashOpacity.value = 0;
    shakeX.value = 0;
    prizeCardScale.value = 0.9;
    prizeCardOpacity.value = 0;
    cardFlip.value = 0;
    boxTeaserOpacity.value = 0;
  }, [
    boxTeaserOpacity,
    cardFlip,
    confettiProgress,
    flashOpacity,
    prizeCardOpacity,
    prizeCardScale,
    rainProgress,
    revealOpacity,
    revealScale,
    shakeX,
    titlePunch,
  ]);

  const triggerReveal = useCallback(
    (forcePacing?: RevealPacing, bypassThrottle = false) => {
      if (products.length === 0) return;
      lockRevealActions();
      accelTierRef.current = 0;
      setActiveAccelTier(0);
      setAccelerateProgress(0);
      setIsAccelerating(false);
      if (accelerateTimerRef.current) {
        clearInterval(accelerateTimerRef.current);
        accelerateTimerRef.current = null;
      }
      const effectivePacing = forcePacing ?? pacing;
      const now = Date.now();
      const throttle = effectivePacing === "fast" ? 380 : 900;
      const inMultiSequence = totalReveals > 1;
      if (playingRef.current && inMultiSequence) {
        stopAll();
        playingRef.current = false;
      }
      if (!bypassThrottle && !inMultiSequence && now - lastPlayRef.current < throttle) return;
      lastPlayRef.current = now;
      const startedAt = now;
      const expectedMs = profile.revealDelayMs + 400;

      stopAll();
      resetMotion();
      setShowReveal(true);
      playingRef.current = true;
      setIsPaused(false);
      touchRevealSeriesEasterEggActivity();
      stepWatchdogRef.current.arm();
      if (orderId) {
        saveRevealInterruptSnapshot({ orderId, revealIndex, phase: "teaser", progress: 0 });
        assetKeyRef.current = markRevealDrawActive(orderId, revealIndex);
      }

      trackEffectEvent("reveal_play", {
        tier,
        productCount: products.length,
        revealIndex,
        totalReveals,
        pacing: effectivePacing,
        driver: "reanimated",
        orderId,
        reduceMotionLevel,
      });

      const completeRevealFromAnim = () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed > expectedMs * 1.85) {
          markRevealPerformanceDegraded();
        }
        finishReveal();
      };

      if (reduceMotion) {
        revealOpacity.value = 1;
        prizeCardScale.value = 1;
        prizeCardOpacity.value = 1;
        cardFlip.value = 1;
        Vibration.vibrate([0, 20]);
        playTierSoundSynced(tier, soundEnabled, { afterBoxTeaser: false });
        setTimeout(() => finishReveal(), scaleRevealDuration(420, effectivePacing, timingOpts));
        return;
      }

      const playBoxTeaser = showBoxTeaser && !lowPerfMode;
      const isFinaleDraw = revealIndex >= totalReveals - 1 && totalReveals > 1;
      const variance = orderId ? resolveEffectVariance(orderId, revealIndex) : null;
      const exitEase = resolvePhaseEasing("exit", effectivePacing);
      const flipEase = resolvePhaseEasing("flip", effectivePacing);
      const teaserEase = resolvePhaseEasing("teaser", effectivePacing);
      const settleMs = getRevealRemoteConfig().exitSettleMs;

      playRevealSoundArc({
        tier,
        revealIndex,
        totalReveals,
        pacing: effectivePacing,
        isFinaleDraw,
        soundEnabled,
        afterBoxTeaser: playBoxTeaser,
        chargeMs: profile.chargeMs,
        accelerateTier: accelTierRef.current,
      });
      if (getRevealRemoteConfig().vibrateFallbackEnabled && getRuntimeRevealHapticEnabled()) {
        try {
          Vibration.vibrate(profile.vibrationPattern);
        } catch {
          trackEffectEvent("reveal_vibrate_failed", { tier, orderId });
        }
      }

      const isCeremony = isPremiumCeremony(tier);
      const isUltimate = isUltimateCeremony(tier);
      const isHiddenTier = tier === "HIDDEN";
      const burstDuration = scaleRevealDuration(Math.round(profile.revealDelayMs * 0.55), effectivePacing, timingOpts);
      const flashIn = scaleRevealDuration(70, effectivePacing, timingOpts);
      const flashOut = scaleRevealDuration(isUltimate ? 320 : isCeremony ? 280 : 200, effectivePacing, timingOpts);
      const mainIn = scaleRevealDuration(isUltimate ? 620 : isCeremony ? 520 : 380, effectivePacing, timingOpts);
      const prizeIn = scaleRevealDuration(240, effectivePacing, timingOpts);
      const flipDelay = scaleRevealDuration(80, effectivePacing, timingOpts);
      const popDelay = scaleRevealDuration(140, effectivePacing, timingOpts);
      const flipSpringMs = resolveFlipSpringMs(effectivePacing, isUltimate, isCeremony);
      const phaseAlign = alignRevealPhaseStart(revealIndex, totalReveals);
      const minHoldMs = popDelay + flipDelay + flipSpringMs;
      const chargeMs = scaleRevealDuration(profile.chargeMs, effectivePacing, timingOpts);
      const burstStart = chargeMs > 0 && (isCeremony || isHiddenTier) ? chargeMs : 0;
      const flashStart = burstStart + phaseAlign.flashDelayMs;
      const holdDuration = resolveHoldDuration(
        effectivePacing,
        profile,
        { ...timingOpts, totalReveals, revealIndex },
        getRevealRemoteConfig().finaleHoldMsExtra,
      );
      const teaserInMs = teaserVariant === "mini" ? 280 : 420;
      const teaserOutMs = teaserVariant === "mini" ? 180 : 280;
      const stepIdleMs = getStepIdleMs(profile, effectivePacing, timingOpts);
      const burstDelay = playBoxTeaser ? Math.round(stepIdleMs * 0.08) : Math.round(stepIdleMs * 0.16);
      const exitIn = scaleRevealDuration(380, effectivePacing, timingOpts);
      const exitPrize = scaleRevealDuration(320, effectivePacing, timingOpts);

      const startMainBurst = () => {
        if (isHiddenTier && !isCeremony) {
          flashOpacity.value = withSequence(
            withTiming(profile.flashPeak * 0.45, { duration: flashIn, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: Math.round(flashOut * 0.5), easing: Easing.in(Easing.quad) }),
          );
          Vibration.vibrate([0, 35, 40, 45]);
        }
        revealOpacity.value = withDelay(
          burstStart,
          withTiming(1, { duration: mainIn, easing: Easing.out(Easing.cubic) }),
        );
        revealScale.value = withDelay(
          burstStart,
          effectivePacing === "finale"
            ? withSequence(
                withSpring(1.1, rnSpring(4, 170)),
                withSpring(1, rnSpring(6, 120)),
              )
            : withSpring(1, rnSpring(5, isUltimate ? 165 : isCeremony ? 150 : 120)),
        );
        titlePunch.value = withDelay(
          burstStart,
          withSpring(profile.pulseScale, rnSpring(4, 160)),
        );
        rainProgress.value = withDelay(
          burstStart,
          withTiming(1, { duration: burstDuration, easing: Easing.out(Easing.cubic) }),
        );
        confettiProgress.value = withDelay(
          burstStart,
          withTiming(1, {
            duration: burstDuration + 120,
            easing: Easing.out(Easing.quad),
          }),
        );
        if (isUltimate) {
          flashOpacity.value = withDelay(
            flashStart,
            withSequence(
              withTiming(profile.flashPeak * 0.65, { duration: flashIn, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: Math.round(flashOut * 0.4), easing: Easing.in(Easing.quad) }),
              withTiming(profile.flashPeak, { duration: flashIn, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: flashOut, easing: Easing.in(Easing.quad) }),
            ),
          );
        } else {
          flashOpacity.value = withDelay(
            flashStart,
            withSequence(
              withTiming(profile.flashPeak, { duration: flashIn, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: flashOut, easing: Easing.in(Easing.quad) }),
            ),
          );
        }
        const popInMs = scaleRevealDuration(isCeremony || isUltimate ? 180 : 220, effectivePacing, timingOpts);
        const popAt = burstStart + popDelay + phaseAlign.prizeCardScaleDelayMs;
        const chainPop = inMultiSequence && !isCeremony && !isUltimate;
        if (chainPop) {
          prizeCardScale.value = withDelay(
            popAt,
            withSpring(1, rnSpring(5, 140)),
          );
        } else {
          const popAccel = inMultiSequence ? 0.9 : isCeremony || isUltimate ? 0.78 : 0.92;
          prizeCardScale.value = withDelay(
            popAt,
            withSequence(
              withTiming(popAccel, {
                duration: Math.round(popInMs * 0.35),
                easing: Easing.in(Easing.cubic),
              }),
              withSpring(1, rnSpring(5, isUltimate ? 175 : isCeremony ? 165 : 140)),
            ),
          );
        }
        prizeCardOpacity.value = withDelay(
          burstStart + popDelay + phaseAlign.prizeCardScaleDelayMs,
          withTiming(1, { duration: prizeIn, easing: Easing.out(Easing.cubic) }),
        );
        cardFlip.value = withDelay(
          burstStart + popDelay + flipDelay + phaseAlign.cardFlipDelayMs,
          isCeremony || isUltimate
            ? withTiming(1, { duration: flipSpringMs, easing: flipEase })
            : withSpring(1, rnSpring(6, isUltimate ? 165 : isCeremony ? 150 : 130)),
        );
      };

      const startExit = () => {
        titlePunch.value = withSpring(1, rnSpring(6, 110));
        if (settleMs > 0) {
          revealScale.value = withDelay(
            holdDuration,
            withSequence(
              withTiming(0.94, { duration: settleMs, easing: exitEase }),
              withTiming(0.88, { duration: exitIn, easing: exitEase }),
            ),
          );
        }
        prizeCardOpacity.value = withDelay(
          holdDuration + (settleMs > 0 ? settleMs : 0),
          withSequence(
            withSpring(1.04, rnSpring(8, 180)),
            withTiming(
              0,
              { duration: exitPrize, easing: exitEase },
              onAnimFinished(completeRevealFromAnim),
            ),
          ),
        );
        revealOpacity.value = withDelay(
          holdDuration + (settleMs > 0 ? settleMs : 0),
          withTiming(0, { duration: exitIn, easing: exitEase }),
        );
      };

      const afterTeaser = () => {
        startMainBurst();
        startExit();
      };

      const strongShake =
        !skipShakeMotion &&
        (isCeremony || isHiddenTier || effectivePacing === "finale" || effectivePacing === "ceremony");
      if (strongShake) {
        runScreenShake(shakeX, effectivePacing === "finale", variance?.shakeStepScale ?? 1);
      }

      if (playBoxTeaser) {
        boxTeaserOpacity.value = withSequence(
          withTiming(1, {
            duration: scaleRevealDuration(teaserInMs, effectivePacing, timingOpts),
            easing: teaserEase,
          }),
          withTiming(0, {
            duration: scaleRevealDuration(teaserOutMs, effectivePacing, timingOpts),
            easing: resolvePhaseEasing("exit", effectivePacing),
          }),
          withDelay(burstDelay, withTiming(0, { duration: 0 }, onAnimFinished(afterTeaser))),
        );
      } else {
        boxTeaserOpacity.value = withDelay(
          burstDelay,
          withTiming(0, { duration: 0 }, onAnimFinished(afterTeaser)),
        );
      }

      const safetyMs =
        holdDuration +
        (playBoxTeaser ? teaserInMs + teaserOutMs + burstDelay : burstDelay) +
        mainIn +
        flipSpringMs +
        1200;
      const forcePrizeMs =
        (playBoxTeaser ? teaserInMs + teaserOutMs + burstDelay : burstDelay) +
        burstStart +
        popDelay +
        phaseAlign.prizeCardScaleDelayMs +
        720;
      if (forcePrizeRevealRef.current) clearTimeout(forcePrizeRevealRef.current);
      forcePrizeRevealRef.current = setTimeout(() => {
        forcePrizeRevealRef.current = null;
        if (!playingRef.current) return;
        cancelAnimation(prizeCardScale);
        cancelAnimation(prizeCardOpacity);
        cancelAnimation(cardFlip);
        prizeCardScale.value = 1;
        prizeCardOpacity.value = 1;
        cardFlip.value = 1;
      }, forcePrizeMs);
      if (playbackSafetyRef.current) clearTimeout(playbackSafetyRef.current);
      playbackSafetyRef.current = setTimeout(() => {
        playbackSafetyRef.current = null;
        if (playingRef.current) finishReveal();
      }, safetyMs);
    },
    [
      products.length,
      stopAll,
      resetMotion,
      reduceMotion,
      tier,
      profile,
      pacing,
      timingOpts,
      showBoxTeaser,
      teaserVariant,
      lowPerfMode,
      soundEnabled,
      revealIndex,
      totalReveals,
      finishReveal,
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
      trackEffectEvent(`reveal_accelerate_tier${accelTier}`, {
        tier,
        driver: "reanimated",
        orderId,
        revealIndex,
      });
      stopAll();
      setAccelerateProgress(0);
      setIsAccelerating(false);
      clearAccelerateTimer();
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
      if (progress >= 0.55) setActiveAccelTier(2);
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

  const accelerateSpeedLabel = resolveAccelerateSpeedLabel(
    isAccelerating,
    accelerateProgress,
    activeAccelTier,
  );
  const revealPlayState: RevealPlayState = !showReveal
    ? "idle"
    : isPaused
      ? "paused"
      : isAccelerating
        ? "accelerating"
        : isReplaySession
          ? "replaying"
          : "playing";

  const skipReveal = useCallback(
    (reason: "skip_one" | "skip_remaining" = "skip_one") => {
      trackEffectEvent(reason === "skip_remaining" ? "reveal_skip_remaining" : "reveal_skip_one", {
        tier,
        reason,
        revealIndex,
        totalReveals,
        driver: "reanimated",
        orderId,
        wasPausedBeforeSkip: isPaused,
      });
      setIsPaused(false);
      stopAll();
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
        cancelRevealMotion([
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
        ]);
        cancelScheduledRevealSounds();
        trackEffectEvent("reveal_pause", { orderId, revealIndex, tier });
        return;
      }
      skipReveal("skip_one");
    },
    [
      tier,
      pacing,
      isPaused,
      skipReveal,
      orderId,
      revealIndex,
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
    ],
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
    motionDriver: "reanimated" as const,
    showReveal,
    revealPlayToken: 0,
    tier,
    profile,
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
    revealTheme,
    teaserVariant,
    accelerateProgress,
    isAccelerating,
    accelerateSpeedLabel,
    revealPlayState,
    triggerReveal: () => triggerReveal(),
    accelerateReveal,
    handleAcceleratePressIn,
    handleAcceleratePressOut,
    skipReveal,
    handleSkipPress,
  };
}
