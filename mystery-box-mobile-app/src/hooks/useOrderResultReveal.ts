import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getRevealAnimationsEnabled,
  getRevealSoundEnabled,
  getRevealTextOnlyMode,
  setRuntimeRevealSoundEnabled,
} from "../utils/revealSettings";
import { useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { rnSpring } from "../effects/reanimated/springConfig";
import type { Product } from "../types";
import {
  countRevealRarity,
  resolveRevealPacing,
  sortRevealSequence,
} from "../effects/revealSequence";
import {
  isFinaleTeaser,
  shouldPlayBoxTeaser,
} from "../effects/revealSequenceEngine";
import { resolveCeremonyTier } from "../effects/ceremonyTier";
import {
  handleModalForceClose,
  markOrderRevealSeen,
  prepareFreshRevealPlayback,
  releaseRevealSession,
  tryAcquireManualReplay,
  pushRevealStackTier,
  popRevealStackTier,
  validateRevealPrizes,
  getRevealQueueLength,
  maybePrefetchNextInQueue,
  setRevealPrefetchHandler,
  subscribeActiveReveal,
} from "../effects/revealOrchestrator";
import { trackEffectEvent } from "../effects/telemetry";
import { usePrizeReveal } from "./usePrizeReveal";
import { useRevealDevice } from "./useRevealDevice";
import { useRevealLifecycle } from "./useRevealLifecycle";
import { prefetchRevealImages } from "../utils/imagePrefetch";
import { shouldAllowRevealPrefetch } from "../effects/revealPrefetchGate";
import { resolveBoxImageUrl, resolveProductImageUrl } from "../utils/boxImage";
import { resolveBatchRevealWindow, shouldShowBatchBeat } from "../effects/revealAdaptiveRhythm";
import { loadRevealBehaviorProfile } from "../effects/revealBehaviorProfile";
import { applyPersonaPack } from "../effects/revealPersonaPack";
import { recordRevealForFatigue, resolveSessionFatigueScale } from "../effects/revealSessionFatigue";
import { recordRevealCompletion } from "../effects/revealTelemetryWaterline";
import { scheduleRevealDrawRelease } from "../effects/revealAssetManager";
import { warmupTierSounds , setRuntimeRevealSoundPack } from "../effects/sound";
import { unlockStoryFragment } from "../effects/revealStoryFragments";
import { grantSurpriseThemeBonus } from "../effects/revealSurpriseBonus";
import { notePaidBoxOpened } from "../effects/revealThemeRotation";
import { useRevealCollectionEasterEgg } from "./useRevealCollectionEasterEgg";
import { resetRevealDriverTierForPaidReveal } from "../effects/revealDriverTier";
import { REVEAL_BOOT_DELAY_MS } from "../effects/revealSessionController";
import { useRevealSequence } from "./useRevealSequence";
import { fetchOrderDrawIntegrity } from "../services/orderService";
import { getAtmosphereOverrides, hydrateAtmosphereRevealOverrides } from "../effects/revealAtmosphereRuntime";
import { resolveAtmosphereSoundPack, type AtmosphereRevealOverrides } from "../effects/revealAtmosphereOverrides";
import {
  connectRevealRoom,
  leaveRevealHostRoom,
  publishRevealRoomProgress,
  publishRevealRoomReaction,
} from "../effects/revealSocialRoom";
import { useRevealSpectatorSessionSync } from "./useRevealSpectatorSessionSync";
import { useRevealHardwareInput } from "../effects/revealHardwareInput";
import { acquireRevealGestureLock } from "../effects/revealGestureLock";
import { normalizeQualityTier } from "../utils/quality";
import { verifyRevealPayload, signRevealPayload } from "../effects/revealIntegrity";
import { toast } from "../utils/toast";
import i18n from "../i18n";
import {
  clearRevealSpectatorShareToken,
  setRevealSpectatorShareToken,
} from "../utils/revealSpectatorTokenBridge";
import { fetchPityProgress, type PityProgress } from "../services/pityService";

type Params = {
  visible: boolean;
  pendingPayment: boolean;
  prizes: Product[];
  authToken?: string;
  boxName: string;
  boxCover?: string;
  boxId?: string;
  boxCategoryName?: string;
  orderId: string;
  revealPlaybackKey?: number;
  onForceClose?: () => void;
};

export function useOrderResultReveal({
  visible,
  pendingPayment,
  prizes,
  boxName,
  boxCover,
  boxId,
  boxCategoryName,
  orderId,
  authToken,
  revealPlaybackKey = 0,
  onForceClose,
}: Params) {
  const {
    reduceMotion,
    reduceMotionLevel,
    textOnlyMode,
    lowPerfMode,
    degradeLevel,
    skipParticles,
    skipTeaserAnim,
    a11yFlashScale,
    a11yLustreScale,
    refreshPerf,
    startFpsMonitor,
    stopFpsMonitor,
  } = useRevealDevice(authToken);
  const revealProducts = useMemo(() => {
    if (pendingPayment || prizes.length === 0) return [];
    return sortRevealSequence(prizes);
  }, [pendingPayment, prizes]);

  const [revealIndex, setRevealIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null);
  const [revealCycleKey, setRevealCycleKey] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [showBatchBeat, setShowBatchBeat] = useState(false);
  const [integrityFailed, setIntegrityFailed] = useState(false);
  const [serverIntegrityFailed, setServerIntegrityFailed] = useState(false);
  const [atmosphereOverrides, setAtmosphereOverrides] = useState<AtmosphereRevealOverrides>({});
  const integrityToastRef = useRef(false);
  const pendingNextIndexRef = useRef<number | null>(null);
  const skipRemainingRef = useRef(false);
  const revealedIdsRef = useRef<string[]>([]);
  const highlightMarkersRef = useRef<number[]>([]);
  const highlightPulse = useSharedValue(1);
  const triggerRevealRef = useRef<(forcePacing?: import("../effects/revealSequence").RevealPacing, bypassThrottle?: boolean) => void>(() => {});
  const lastForcedPlaybackRef = useRef<number | null>(null);

  const sequence = useRevealSequence({
    enabled: visible && !pendingPayment && prizes.length > 0,
    orderId,
    source: "modal",
    products: revealProducts,
    pendingPayment,
    preferSettlementOnSeen: false,
    onPlay: () => {
      setAutoPlayBlocked(false);
      setSequenceDone(false);
      setShowSummary(false);
      triggerRevealRef.current(undefined, true);
    },
    onSkipToSettlement: () => {
      setAutoPlayBlocked(true);
      jumpToSummary();
    },
    onSkipToPrizes: () => {
      setAutoPlayBlocked(false);
      setSequenceDone(false);
      setShowSummary(false);
      triggerRevealRef.current(undefined, true);
    },
    onQueued: () => setAutoPlayBlocked(true),
    onOfflineBlocked: () => setAutoPlayBlocked(true),
  });

  const currentRevealProduct = revealProducts[revealIndex];
  const currentReveal = currentRevealProduct ? [currentRevealProduct] : revealProducts;
  const ceremonyTier = currentRevealProduct
    ? resolveCeremonyTier(currentRevealProduct, revealProducts)
    : undefined;
  const pacing = resolveRevealPacing(revealIndex, revealProducts.length, ceremonyTier);
  const showBoxTeaser = shouldPlayBoxTeaser(revealIndex, revealProducts.length);
  const teaserVariant =
    revealIndex === 0
      ? "full"
      : isFinaleTeaser(revealIndex, revealProducts.length) ||
          (showBoxTeaser && revealIndex > 0 && revealProducts.length > 1)
        ? "mini"
        : "full";
  const rarityStats = useMemo(() => countRevealRarity(revealProducts), [revealProducts]);

  const boxCoverUri = resolveBoxImageUrl({ id: boxName, name: boxName, cover: boxCover });
  const currentPrizeImage = currentRevealProduct
    ? resolveProductImageUrl(
        currentRevealProduct.id,
        currentRevealProduct.name,
        currentRevealProduct.cover,
      )
    : undefined;

  const batchWindow = useMemo(() => resolveBatchRevealWindow(revealProducts.length), [revealProducts.length]);
  const collectionEasterEgg = useRevealCollectionEasterEgg(
    currentRevealProduct?.id,
    boxId,
    visible && !pendingPayment && !sequenceDone,
  );

  const jumpToSummary = useCallback(() => {
    setSequenceDone(true);
    setShowSummary(true);
    markOrderRevealSeen(orderId);
    releaseRevealSession(orderId, "complete");
  }, [orderId]);

  useEffect(() => {
    if (!visible || pendingPayment) return;
    setSequenceDone(false);
    setShowSummary(false);
    setRevealIndex(0);
    setAutoPlayBlocked(false);
    skipRemainingRef.current = false;
    revealedIdsRef.current = [];
  }, [visible, pendingPayment, orderId]);

  useEffect(() => {
    if (!visible || !pendingPayment) return;
    setSequenceDone(false);
    setShowSummary(false);
    setRevealIndex(0);
    setAutoPlayBlocked(false);
    skipRemainingRef.current = false;
    revealedIdsRef.current = [];
    highlightMarkersRef.current = [];
    setShowBatchBeat(false);
    pendingNextIndexRef.current = null;
  }, [visible, pendingPayment, orderId]);

  useRevealLifecycle({
    enabled: visible && !pendingPayment && !sequenceDone,
    orderId,
    source: "modal",
    revealIndex,
    revealedProductIds: revealedIdsRef.current,
    highlightMarkers: highlightMarkersRef.current,
    skipRemaining: skipRemainingRef.current,
    phase: showSummary ? "summary" : sequenceDone ? "idle" : "playing",
    onResumeFromProgress: (snap) => {
      if (snap.revealIndex > revealIndex) {
        setRevealIndex(snap.revealIndex);
        setRevealCycleKey((k) => k + 1);
      }
    },
    onBackgroundTimeout: jumpToSummary,
  });

  useEffect(() => {
    if (!visible || pendingPayment || prizes.length === 0) return;
    if (!shouldAllowRevealPrefetch()) return;
    const uris = [
      boxCoverUri,
      ...revealProducts.map((p) => resolveProductImageUrl(p.id, p.name, p.cover)),
    ];
    if (batchWindow.enabled) {
      const batchStart = Math.floor(revealIndex / batchWindow.batchSize) * batchWindow.batchSize;
      const prefetchEnd = Math.min(revealProducts.length, batchStart + batchWindow.batchSize * 2);
      void prefetchRevealImages([
        boxCoverUri,
        ...revealProducts.slice(batchStart, prefetchEnd).map((p) =>
          resolveProductImageUrl(p.id, p.name, p.cover),
        ),
      ]);
      return;
    }
    void prefetchRevealImages(uris);
    void warmupTierSounds();
  }, [visible, pendingPayment, prizes.length, boxCoverUri, revealProducts, batchWindow, revealIndex]);

  useEffect(() => {
    void loadRevealBehaviorProfile().then((profile) => applyPersonaPack(profile));
    void hydrateAtmosphereRevealOverrides().then((overrides) => {
      setAtmosphereOverrides(overrides);
      const pack = resolveAtmosphereSoundPack(overrides.soundPackId);
      if (pack) setRuntimeRevealSoundPack(pack);
    });
  }, []);

  useEffect(() => {
    if (!visible || pendingPayment) return;
    void Promise.all([getRevealSoundEnabled(), getRevealAnimationsEnabled(), getRevealTextOnlyMode()]).then(
      ([sound, _animations, textOnly]) => {
        const enabled = sound && !textOnly;
        setSoundEnabled(enabled);
        setRuntimeRevealSoundEnabled(enabled);
      },
    );
  }, [visible, pendingPayment]);

  useEffect(() => {
    if (!visible || !validateRevealPrizes(prizes)) {
      if (visible && prizes.length === 0 && !pendingPayment && revealPlaybackKey <= 0) {
        setSequenceDone(true);
        setShowSummary(false);
      }
    }
  }, [visible, prizes, pendingPayment, revealPlaybackKey]);

  useEffect(() => {
    if (!visible || pendingPayment || prizes.length === 0) {
      setIntegrityFailed(false);
      setServerIntegrityFailed(false);
      return;
    }
    const canonical = sortRevealSequence(prizes);
    const sig = signRevealPayload(canonical);
    const key = `reveal_integrity:${orderId}`;
    void AsyncStorage.getItem(key).then((stored) => {
      if (!stored) {
        void AsyncStorage.setItem(key, sig);
        setIntegrityFailed(false);
        return;
      }
      setIntegrityFailed(!verifyRevealPayload(canonical, stored));
    });
    if (authToken) {
      void fetchOrderDrawIntegrity(authToken, orderId)
        .then((row) => setServerIntegrityFailed((row?.issueCount ?? 0) > 0))
        .catch(() => setServerIntegrityFailed(true));
    }
  }, [visible, pendingPayment, prizes, orderId, authToken]);

  useEffect(() => {
    if (!visible || (!integrityFailed && !serverIntegrityFailed)) return;
    if (integrityToastRef.current) return;
    integrityToastRef.current = true;
    toast.info(
      i18n.t("orderResult.integrityFallback"),
    );
  }, [visible, integrityFailed, serverIntegrityFailed]);

  useEffect(() => {
    if (
      textOnlyMode &&
      visible &&
      !pendingPayment &&
      prizes.length > 0 &&
      !sequenceDone
    ) {
      jumpToSummary();
    }
  }, [textOnlyMode, visible, pendingPayment, prizes.length, sequenceDone, jumpToSummary]);

  const onRevealComplete = useCallback(() => {
    recordRevealForFatigue();
    trackEffectEvent("reveal_fatigue_scale", { scale: resolveSessionFatigueScale() });
    if (currentRevealProduct) {
      revealedIdsRef.current = [...revealedIdsRef.current, currentRevealProduct.id];
      const tier = normalizeQualityTier(currentRevealProduct.qualityType);
      if (tier !== "GENERAL") {
        publishRevealRoomReaction(tier === "LEGENDARY" || tier === "LEGEND" ? "★" : "•");
      }
      if (ceremonyTier && ceremonyTier !== "GENERAL" && !highlightMarkersRef.current.includes(revealIndex)) {
        highlightMarkersRef.current = [...highlightMarkersRef.current, revealIndex];
        void unlockStoryFragment({
          id: `${orderId}:${revealIndex}`,
          productId: currentRevealProduct.id,
          text: currentRevealProduct.name,
          unlockedAt: Date.now(),
        }).then(() => {
          toast.success(i18n.t("revealOverlay.storyFragmentUnlocked", { name: currentRevealProduct.name }));
        });
      }
      setHighlightProductId(currentRevealProduct.id);
      highlightPulse.value = withSequence(
        withTiming(1.08, { duration: 160 }),
        withSpring(1, rnSpring(5, 110)),
      );
    }
    refreshPerf();

    if (skipRemainingRef.current || revealIndex >= revealProducts.length - 1) {
      recordRevealCompletion(true, skipRemainingRef.current);
      jumpToSummary();
      if (revealProducts.length > 1) {
        trackEffectEvent("reveal_sequence_complete", {
          orderId,
          total: revealProducts.length,
          skipped: skipRemainingRef.current,
        });
      }
      return;
    }

    const nextIndex = revealIndex + 1;
    if (shouldShowBatchBeat(revealIndex, revealProducts.length, batchWindow.batchSize)) {
      pendingNextIndexRef.current = nextIndex;
      setShowBatchBeat(true);
      trackEffectEvent("reveal_batch_beat_show", {
        orderId,
        segment: Math.floor(revealIndex / batchWindow.batchSize) + 1,
      });
      return;
    }

    if (batchWindow.enabled) {
      const batchEnd = Math.floor(revealIndex / batchWindow.batchSize) * batchWindow.batchSize + batchWindow.batchSize - 1;
      if (revealIndex === batchEnd && revealIndex < revealProducts.length - 1) {
        toast.info(
          i18n.t("orderResult.batchSegmentComplete", {
            current: Math.floor(revealIndex / batchWindow.batchSize) + 1,
            total: Math.ceil(revealProducts.length / batchWindow.batchSize),
          }),
        );
      }
    }

    setRevealCycleKey((k) => k + 1);
    setRevealIndex(nextIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [
    currentRevealProduct,
    revealIndex,
    revealProducts.length,
    orderId,
    highlightPulse,
    refreshPerf,
    jumpToSummary,
    batchWindow,
  ]);

  const reveal = usePrizeReveal({
    products: currentReveal.length ? currentReveal : prizes,
    lowPerfMode,
    reduceMotion,
    reduceMotionLevel,
    autoReplay: false,
    soundEnabled,
    revealIndex,
    totalReveals: revealProducts.length,
    showBoxTeaser,
    teaserVariant,
    pacing,
    drawProducts: revealProducts,
    prizeName: currentRevealProduct?.name,
    boxName,
    boxCategoryName,
    orderId,
    prizeImageUri: currentPrizeImage,
    hasAuth: !!authToken,
    onRevealComplete,
  });

  triggerRevealRef.current = reveal.triggerReveal;

  useEffect(() => {
    if (!visible || pendingPayment || !orderId) return;
    const hasHidden = prizes.some((item) => normalizeQualityTier(item.qualityType) === "HIDDEN");
    void notePaidBoxOpened({
      orderId,
      hasHidden,
      seriesComplete: !!collectionEasterEgg.seriesComplete,
    }).then((result) => {
      if (result.newlyUnlocked.length === 0) return;
      const name = result.newlyUnlocked
        .map((key) => i18n.t(`effectsCenter.theme_${key}`))
        .join(" · ");
      toast.success(i18n.t("effectsCenter.unlockedToast", { name }));
    });
  }, [visible, pendingPayment, orderId, prizes, collectionEasterEgg.seriesComplete]);

  useEffect(() => {
    if (!visible || pendingPayment || !orderId || !reveal.surpriseDocTheme) return;
    void grantSurpriseThemeBonus({
      token: authToken,
      orderId,
      surprise: true,
    }).then((result) => {
      if (!result || result.alreadyGranted || result.skipped) return;
      toast.success(i18n.t("revealOverlay.surpriseBonus", { count: result.fragments }));
    });
  }, [visible, pendingPayment, orderId, authToken, reveal.surpriseDocTheme]);

  useEffect(() => {
    if (!visible || pendingPayment || prizes.length === 0 || revealPlaybackKey <= 0) return;
    if (lastForcedPlaybackRef.current === revealPlaybackKey) return;
    lastForcedPlaybackRef.current = revealPlaybackKey;

    resetRevealDriverTierForPaidReveal();
    prepareFreshRevealPlayback(orderId);
    tryAcquireManualReplay(orderId, "modal");
    setSequenceDone(false);
    setShowSummary(false);
    setAutoPlayBlocked(false);
    setRevealIndex(0);
    skipRemainingRef.current = false;
    revealedIdsRef.current = [];
    highlightMarkersRef.current = [];
    setRevealCycleKey((k) => k + 1);

    const timer = setTimeout(() => {
      triggerRevealRef.current(undefined, true);
    }, REVEAL_BOOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible, pendingPayment, prizes.length, orderId, revealPlaybackKey]);

  useEffect(() => {
    if (!visible || pendingPayment || prizes.length === 0 || revealPlaybackKey <= 0) return;
    if (sequenceDone || showSummary) return;
    const timer = setTimeout(() => {
      if (!sequenceDone && !showSummary && !reveal.showReveal) {
        trackEffectEvent("reveal_boot_fallback_summary", { orderId });
        jumpToSummary();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [
    visible,
    pendingPayment,
    prizes.length,
    orderId,
    revealPlaybackKey,
    sequenceDone,
    showSummary,
    reveal.showReveal,
    jumpToSummary,
  ]);

  const spectatorPhase = showSummary
    ? "summary"
    : sequenceDone
      ? "idle"
      : reveal.showReveal
        ? "playing"
        : "gap";
  const { spectatorShareToken } = useRevealSpectatorSessionSync({
    enabled: visible && !pendingPayment && !!authToken,
    authToken,
    orderId,
    boxId,
    revealIndex,
    total: revealProducts.length,
    products: revealProducts,
    currentProduct: currentRevealProduct,
    phase: spectatorPhase,
  });

  useEffect(() => {
    return subscribeActiveReveal((session) => {
      if (session?.phase === "playing" && session.orderId !== orderId && visible && !sequenceDone) {
        setAutoPlayBlocked(true);
      }
    });
  }, [orderId, visible, sequenceDone]);

  useEffect(() => {
    if (!autoPlayBlocked || !visible) return;
    return acquireRevealGestureLock();
  }, [autoPlayBlocked, visible]);

  useEffect(() => {
    if (!visible || pendingPayment || sequenceDone || autoPlayBlocked || showBatchBeat) return;
    return sequence.scheduleNextReveal({
      currentIndex: revealIndex,
      total: revealProducts.length,
      ceremony: ceremonyTier,
      trigger: () => triggerRevealRef.current(undefined, true),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [
    visible,
    pendingPayment,
    sequenceDone,
    autoPlayBlocked,
    showBatchBeat,
    revealIndex,
    revealProducts.length,
    ceremonyTier,
    sequence.scheduleNextReveal,
  ]);

  useEffect(() => {
    if (!visible || pendingPayment) {
      setRevealPrefetchHandler(null);
      return;
    }
    setRevealPrefetchHandler((nextOrderId) => {
      void prefetchRevealImages([]);
      trackEffectEvent("reveal_queue_prefetch", { orderId: nextOrderId });
    });
    return () => setRevealPrefetchHandler(null);
  }, [visible, pendingPayment]);

  useEffect(() => {
    if (!visible || pendingPayment) return;
    maybePrefetchNextInQueue(orderId, revealIndex, revealProducts.length);
    const nextUris = revealProducts
      .slice(revealIndex + 1, revealIndex + 3)
      .map((p) => resolveProductImageUrl(p.id, p.name, p.cover));
    if (nextUris.length > 0) void prefetchRevealImages(nextUris);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [visible, pendingPayment, orderId, revealIndex, revealProducts.length]);

  useEffect(() => {
    if (!visible || pendingPayment || reduceMotion) {
      stopFpsMonitor();
      return;
    }
    startFpsMonitor();
    return () => stopFpsMonitor();
  }, [visible, pendingPayment, reduceMotion, startFpsMonitor, stopFpsMonitor]);

  useEffect(() => {
    if (!visible || pendingPayment) {
      popRevealStackTier("modal");
      return;
    }
    pushRevealStackTier("modal");
    return () => popRevealStackTier("modal");
  }, [visible, pendingPayment]);

  const jumpToReveal = useCallback(
    (index: number) => {
      if (index < 0 || index >= revealProducts.length) return;
      skipRemainingRef.current = false;
      setSequenceDone(false);
      setShowSummary(false);
      reveal.skipReveal("skip_one");
      setRevealIndex(index);
      trackEffectEvent("reveal_jump", { orderId, index, source: "modal" });
      setTimeout(() => triggerRevealRef.current(undefined, true), 60);
    },
    [reveal, revealProducts.length, orderId],
  );

  const skipCurrent = useCallback(() => {
    trackEffectEvent("reveal_skip_one", { orderId, revealIndex, source: "modal" });
    reveal.skipReveal("skip_one");
  }, [reveal, orderId, revealIndex]);

  useRevealHardwareInput(visible && !sequenceDone && !pendingPayment, {
    skip: skipCurrent,
    accelerate: () => reveal.accelerateReveal(),
    confirm: () => triggerRevealRef.current(undefined, true),
  });

  const skipRemaining = useCallback(() => {
    skipRemainingRef.current = true;
    trackEffectEvent("reveal_skip_remaining", { orderId, atIndex: revealIndex, source: "modal" });
    toast.info(i18n.t("orderResult.skipAllRemainingToast"));
    reveal.skipReveal("skip_remaining");
    jumpToSummary();
    if (revealProducts.length > 0) {
      setHighlightProductId(revealProducts[revealProducts.length - 1].id);
    }
  }, [reveal, orderId, revealIndex, revealProducts, jumpToSummary]);

  const dismissBatchBeat = useCallback(() => {
    setShowBatchBeat(false);
    trackEffectEvent("reveal_batch_beat_complete", { orderId });
    const batchKey = `${orderId}:batch:${Math.floor(revealIndex / batchWindow.batchSize)}`;
    scheduleRevealDrawRelease(batchKey, true);
    const next = pendingNextIndexRef.current;
    pendingNextIndexRef.current = null;
    if (next == null) return;
    setRevealCycleKey((k) => k + 1);
    setRevealIndex(next);
  }, [orderId, revealIndex, batchWindow.batchSize]);

  const batchBeatSegment = useMemo(
    () => ({
      current: Math.floor(revealIndex / batchWindow.batchSize) + 1,
      total: Math.ceil(revealProducts.length / batchWindow.batchSize),
    }),
    [revealIndex, batchWindow.batchSize, revealProducts.length],
  );

  const dismissSummary = useCallback(() => setShowSummary(false), []);

  const handleModalDismiss = useCallback(() => {
    if (sequenceDone || showSummary) {
      onForceClose?.();
      return;
    }
    handleModalForceClose(orderId);
    jumpToSummary();
    onForceClose?.();
  }, [sequenceDone, showSummary, orderId, jumpToSummary, onForceClose]);

  useEffect(() => {
    if (!visible || pendingPayment) {
      leaveRevealHostRoom();
      return;
    }
    void connectRevealRoom(orderId, authToken, "host");
    return () => leaveRevealHostRoom();
  }, [visible, pendingPayment, orderId, authToken]);

  useEffect(() => {
    if (!visible || pendingPayment) return;
    publishRevealRoomProgress({
      revealIndex,
      total: revealProducts.length,
      phase: showSummary ? "summary" : sequenceDone ? "idle" : reveal.showReveal ? "playing" : "gap",
    });
  }, [visible, pendingPayment, sequenceDone, revealIndex, revealProducts.length, showSummary, reveal.showReveal]);

  useEffect(() => {
    if (!visible || !orderId) return;
    setRevealSpectatorShareToken(orderId, spectatorShareToken);
    return () => clearRevealSpectatorShareToken(orderId);
  }, [visible, orderId, spectatorShareToken]);

  const [pityProgress, setPityProgress] = useState<PityProgress | null>(null);

  const refetchPityProgress = useCallback(async () => {
    if (!authToken || !boxId) {
      setPityProgress(null);
      return;
    }
    try {
      const next = await fetchPityProgress(authToken, boxId);
      setPityProgress(next);
    } catch {
      setPityProgress(null);
    }
  }, [authToken, boxId]);

  useEffect(() => {
    if (!visible || pendingPayment || !authToken || !boxId) {
      setPityProgress(null);
      return;
    }
    void refetchPityProgress();
  }, [visible, pendingPayment, authToken, boxId, sequenceDone, refetchPityProgress]);

  return {
    revealProducts,
    pityProgress,
    refetchPityProgress,
    revealIndex,
    showSummary,
    sequenceDone,
    highlightProductId,
    highlightPulse,
    rarityStats,
    currentRevealProduct,
    currentPrizeImage,
    revealCycleKey,
    pacing,
    showBoxTeaser,
    boxCoverUri,
    boxId,
    reduceMotion,
    reduceMotionLevel,
    degradeLevel,
    skipParticles: skipParticles || atmosphereOverrides.skipParticles || !!getAtmosphereOverrides().skipParticles,
    atmosphereParticleScale:
      getAtmosphereOverrides().particleScale ?? atmosphereOverrides.particleScale ?? 1,
    skipTeaserAnim,
    collectionEasterEgg,
    autoPlayBlocked,
    spectatorShareToken,
    queueLength: getRevealQueueLength(),
    showBatchBeat,
    batchBeatSegment,
    dismissBatchBeat,
    skipCurrent,
    skipRemaining,
    dismissSummary,
    jumpToReveal,
    handleModalDismiss,
    a11yFlashScale,
    a11yLustreScale,
    ...reveal,
    staticFallback: reveal.staticFallback,
  };
}
