import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, RefreshControl, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useTabletLayout } from "../hooks/useTabletLayout";
import { ORDER_STATUS } from "../config/constants";
import { normalizePrizeProducts } from "../effects/normalize";
import { resolveRevealPacing, sortRevealSequence } from "../effects/revealSequence";
import {
  isFinaleTeaser,
  shouldPlayBoxTeaser,
} from "../effects/revealSequenceEngine";
import { verifyRevealPayload, signRevealPayload } from "../effects/revealIntegrity";
import { resolveCeremonyTier } from "../effects/ceremonyTier";
import { resetRevealDriverTierForPaidReveal } from "../effects/revealDriverTier";
import { REVEAL_BOOT_DELAY_MS } from "../effects/revealSessionController";
import { prefetchRevealImages } from "../utils/imagePrefetch";
import { usePrizeReveal } from "../hooks/usePrizeReveal";
import { useRevealDevice } from "../hooks/useRevealDevice";
import { useRevealGestureLock, isRevealGestureLocked, subscribeRevealGestureLock } from "../effects/revealGestureLock";
import { getOrderBoxCover, getOrderBoxName, getOrderStatusLabel, getOrderStatusTheme } from "../order-utils";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import {
  OrderDetailsActions,
  OrderDetailsHeader,
  OrderDetailsPrizes,
  OrderDetailsTimeline,
  buildOrderDetailsStyles,
} from "./order-details";
import {
  getRevealImmersiveReplay,
  getRevealReplayMode,
  getRevealReplayPreference,
  getRevealSoundEnabled,
  setRuntimeRevealSoundEnabled,
} from "../utils/revealSettings";
import {
  buildReplayPlaylistIndices,
  computePrizeDuplicateMeta,
  nextReplayPlaylistIndex,
} from "../utils/revealReplayPlaylist";
import {
  hasOrderRevealBeenSeen,
  markOrderRevealSeen,
  subscribeActiveReveal,
  subscribeSeenOrderReveal,
  validateRevealPrizes,

  releaseRevealSession,
  tryAcquireManualReplay} from "../effects/revealOrchestrator";
import { useRevealSequence } from "../hooks/useRevealSequence";
import { fetchOrderDrawIntegrity } from "../services/orderService";
import { getAtmosphereOverrides, hydrateAtmosphereRevealOverrides } from "../effects/revealAtmosphereRuntime";
import { resolveAtmosphereSoundPack } from "../effects/revealAtmosphereOverrides";
import { setRuntimeRevealSoundPack } from "../effects/sound";
import { useRevealSpectatorSessionSync } from "../hooks/useRevealSpectatorSessionSync";
import { shouldAllowRevealPrefetch } from "../effects/revealPrefetchGate";
import {
  connectRevealRoom,
  leaveRevealHostRoom,
  publishRevealRoomProgress,
  publishRevealRoomReaction,
} from "../effects/revealSocialRoom";
import { normalizeQualityTier } from "../utils/quality";
import { loadRevealProgress } from "../utils/revealProgressStorage";
import { RevealLocalDanmaku } from "./ui/RevealLocalDanmaku";
import { RevealReactionTicker } from "./ui/RevealReactionTicker";
import { RevealPlayer } from "./ui/RevealPlayer";
import { RevealSequenceChrome } from "./ui/RevealSequenceChrome";
import { RevealStaticFallback } from "./ui/RevealStaticFallback";
import { ProductStorySheet } from "./ui/ProductStorySheet";
import type { ProductStory } from "../effects/revealProductStory";
import { shouldShowReturnWelcome, markReturnWelcomeShown } from "../effects/revealReturnWelcome";
import { OrderShareCard } from "./OrderShareCard";
import { SharePosterModal } from "./SharePosterModal";
import { buildOrderCommunityDraft } from "../utils/orderShareDraft";
import { useAuthToken } from "../hooks/useAuthToken";
import { useOrderDetailsAuxiliary } from "../hooks/useOrderDetailsAuxiliary";
import { toast } from "../utils/toast";
import { formatCurrencyOptional } from "../utils/formatCurrency";
import { resolveProductImageUrl } from "../utils/boxImage";
import { recordManualReplay } from "../effects/revealReplayLimiter";
import { canGuestReplay, notifyGuestRevealBlocked, recordGuestReplay } from "../effects/revealGuestPolicy";

import { useRevealLifecycle } from "../hooks/useRevealLifecycle";
import { resolveCarrierLabel } from "../utils/carrierLabel";
import { usePendingPaymentCountdownLabels } from "../hooks/usePendingPaymentCountdownLabels";
import type { Order } from "../types";
import { applyRefund } from "../services/refundService";
import { resolveOrderBoxId } from "../utils/pityCompensate";
import { fetchBoxProbability, resolveDisplayRates } from "../services/probabilityService";

type Props = {
  order: Order;
  canCancel: boolean;
  onBack: () => void;
  onPay: (id: string) => void;
  canPay: boolean;
  onRefresh: () => void;
  onCancel: (id: string) => void;
  onConfirmReceive?: (id: string) => void;
  refreshing?: boolean;
  onShareToCommunity?: (draft: string) => void;
};

export function OrderDetailsView(props: Props) {
  return (
    <Suspense fallback={null}>
      <OrderDetailsViewInner {...props} />
    </Suspense>
  );
}

function OrderDetailsViewInner(props: Props) {
  const {
    order,
    canCancel,
    canPay,
    onBack,
    onPay,
    onRefresh,
    onCancel,
    onConfirmReceive,
    refreshing,
    onShareToCommunity,
  } = props;
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildOrderDetailsStyles);
  const { confirm } = useConfirmDialog();
  const trackingNumber = order.baseOrder?.trackingNumber;
  const {
    logistics,
    carrierCode,
    logisticsLoading,
    logisticsError,
    reloadAuxiliary,
  } = useOrderDetailsAuxiliary(authToken, order.id, order.status, trackingNumber);
  const { isTablet } = useTabletLayout();
  const countdownLabels = usePendingPaymentCountdownLabels();
  const carrierLabel = useMemo(() => resolveCarrierLabel(carrierCode, t), [carrierCode, t]);
  const canConfirmReceive = order.status === ORDER_STATUS.TO_BE_RECEIVED && !!onConfirmReceive;
  const canApplyRefund =
    (order.status === ORDER_STATUS.TO_BE_DELIVERED || order.status === ORDER_STATUS.TO_BE_RECEIVED) &&
    !(order.items ?? []).some((item) => (item.products?.length ?? 0) > 0);
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const confirmPayWithOdds = useCallback(async () => {
    const boxId = resolveOrderBoxId(order);
    if (!boxId) {
      toast.error(t("orderDetails.repayOddsUnavailable"));
      return;
    }
    const drawCount = Math.max(
      1,
      (order.items ?? []).reduce((sum, item) => sum + Math.max(1, Number(item.mysteryBoxCount ?? 1)), 0),
    );
    const prob = await fetchBoxProbability(boxId, {
      token: authToken || undefined,
      drawCount,
    });
    const rates = resolveDisplayRates(prob);
    if (!rates) {
      toast.error(t("orderDetails.repayOddsUnavailable"));
      return;
    }
    const ratesLine = t("checkout.probabilityRates", {
      legendary: (rates.legendaryRate / 100).toFixed(2),
      hidden: (rates.hiddenRate / 100).toFixed(2),
      general: (rates.generalRate / 100).toFixed(2),
    });
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(
        t("orderDetails.repayOddsTitle"),
        `${ratesLine}\n\n${t("orderDetails.repayOddsBody")}`,
        [
          { text: t("common.cancel"), style: "cancel", onPress: () => resolve(false) },
          { text: t("orderDetails.payNow"), onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (ok) onPay(order.id);
  }, [authToken, onPay, order, t]);

  const submitRefund = useCallback(async () => {
    if (!authToken || refundSubmitting || !canApplyRefund) return;
    const ok = await confirm({
      title: t("orderDetails.refundConfirmTitle"),
      message: t("orderDetails.refundConfirmMessage"),
      confirmLabel: t("orderDetails.applyRefund"),
    });
    if (!ok) return;
    setRefundSubmitting(true);
    try {
      const amount = Number(order.baseOrder?.payment?.payAmount ?? 0);
      await applyRefund(authToken, {
        orderId: order.id,
        reason: t("orderDetails.refundReasonDefault"),
        amount,
      });
      toast.success(t("orderDetails.refundSubmitted"));
      onRefresh();
    } catch (error) {
      toast.error(String(error instanceof Error ? error.message : error));
    } finally {
      setRefundSubmitting(false);
    }
  }, [authToken, canApplyRefund, confirm, onRefresh, order, refundSubmitting, t]);

  const prizeProducts = useMemo(() => normalizePrizeProducts(order), [order]);
  const sortedPrizes = useMemo(() => sortRevealSequence(prizeProducts), [prizeProducts]);
  const pendingPayment = order.status === ORDER_STATUS.TO_BE_PAID;
  const isPaidWithPrizes =
    prizeProducts.length > 0 && !pendingPayment;
  const needsInitialReveal =
    isPaidWithPrizes && !hasOrderRevealBeenSeen(order.id);
  const [prizesUnveiled, setPrizesUnveiled] = useState(() => !needsInitialReveal);
  const [playlistIndex, setPlaylistIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sharePosterVisible, setSharePosterVisible] = useState(false);
  const [replayPref, setReplayPref] = useState<"all" | "finale" | "highlights">("all");
  const [replayMode, setReplayMode] = useState<"once" | "loop">("once");
  const [immersiveReplay, setImmersiveReplay] = useState(false);
  const [remoteReplayBlocked, setRemoteReplayBlocked] = useState(false);
  const [gestureLocked, setGestureLocked] = useState(isRevealGestureLocked());
  const [integrityFailed, setIntegrityFailed] = useState(false);
  const [serverIntegrityFailed, setServerIntegrityFailed] = useState(false);
  const _integrityToastRef = useRef(false);
  const [storySheet, setStorySheet] = useState<ProductStory | null>(null);
  const initialRevealBootRef = useRef<string | null>(null);
  const revealedIdsRef = useRef<string[]>([]);
  const highlightMarkersRef = useRef<number[]>([]);
  const [replayMarkers, setReplayMarkers] = useState<number[]>([]);
  const replayPlaylistIndices = useMemo(
    () => buildReplayPlaylistIndices(sortedPrizes, replayPref, replayMarkers),
    [sortedPrizes, replayPref, replayMarkers],
  );
  const prizeDuplicateMeta = useMemo(() => computePrizeDuplicateMeta(prizeProducts), [prizeProducts]);
  useEffect(() => {
    void loadRevealProgress(order.id).then((snap) => setReplayMarkers(snap?.highlightMarkers ?? []));
  }, [order.id]);
  useEffect(() => {
    void getRevealSoundEnabled().then((enabled) => {
      setSoundEnabled(enabled);
      setRuntimeRevealSoundEnabled(enabled);
    });
    void getRevealReplayPreference().then(setReplayPref);
    void getRevealReplayMode().then(setReplayMode);
    void getRevealImmersiveReplay().then(setImmersiveReplay);
  }, []);
  useEffect(() => {
    return subscribeSeenOrderReveal(() => {
      if (hasOrderRevealBeenSeen(order.id)) {
        setPrizesUnveiled(true);
      }
    });
  }, [order.id]);
  useEffect(() => {
    return subscribeRevealGestureLock(setGestureLocked);
  }, []);
  useEffect(() => {
    if (!isPaidWithPrizes || prizesUnveiled) return;
    void shouldShowReturnWelcome().then((show) => {
      if (show) {
        toast.info(t("orderDetails.returnWelcome"));
        void markReturnWelcomeShown();
      }
    });
  }, [isPaidWithPrizes, prizesUnveiled, t]);
  useEffect(() => {
    void hydrateAtmosphereRevealOverrides().then((overrides) => {
      setAtmosphereSkipParticles(!!overrides.skipParticles);
      setAtmosphereParticleScale(overrides.particleScale ?? 1);
      const pack = resolveAtmosphereSoundPack(overrides.soundPackId);
      if (pack) setRuntimeRevealSoundPack(pack);
    });
  }, []);

  useEffect(() => {
    if (!isPaidWithPrizes || sortedPrizes.length === 0) {
      setIntegrityFailed(false);
      return;
    }
    const sig = signRevealPayload(sortedPrizes);
    const key = `reveal_integrity:${order.id}`;
    void AsyncStorage.getItem(key).then((stored) => {
      if (!stored) {
        void AsyncStorage.setItem(key, sig);
        setIntegrityFailed(false);
        return;
      }
      setIntegrityFailed(!verifyRevealPayload(sortedPrizes, stored));
    });
    if (authToken) {
      void fetchOrderDrawIntegrity(authToken, order.id)
        .then((row) => setServerIntegrityFailed((row?.issueCount ?? 0) > 0))
        .catch(() => setServerIntegrityFailed(true));
    }
  }, [isPaidWithPrizes, sortedPrizes, order.id, authToken]);

  useEffect(() => {
    return subscribeActiveReveal((session) => {
      setRemoteReplayBlocked(session?.phase === "playing" && session.orderId !== order.id);
    });
  }, [order.id]);
  useEffect(() => {
    const needReveal = isPaidWithPrizes && !hasOrderRevealBeenSeen(order.id);
    setPrizesUnveiled(!needReveal);
    initialRevealBootRef.current = null;
    revealedIdsRef.current = [];
    highlightMarkersRef.current = [];
  }, [order.id, isPaidWithPrizes]);
  const { reduceMotion, reduceMotionLevel, lowPerfMode, a11yFlashScale, a11yLustreScale, skipParticles: deviceSkipParticles } =
    useRevealDevice(authToken);
  const [atmosphereSkipParticles, setAtmosphereSkipParticles] = useState(false);
  const [atmosphereParticleScale, setAtmosphereParticleScale] = useState(1);
  const liveAtmosphere = getAtmosphereOverrides();
  const skipParticlesReveal =
    deviceSkipParticles || atmosphereSkipParticles || !!liveAtmosphere.skipParticles;
  const liveAtmosphereParticleScale = liveAtmosphere.particleScale ?? atmosphereParticleScale;
  const activeReplayProduct = useMemo(() => {
    if (playlistIndex != null) return sortedPrizes[playlistIndex];
    const finale = sortedPrizes[sortedPrizes.length - 1];
    return finale;
  }, [playlistIndex, sortedPrizes]);
  const replayProducts = activeReplayProduct ? [activeReplayProduct] : [];
  const activeDrawIndex =
    playlistIndex ?? (sortedPrizes.length > 0 ? sortedPrizes.length - 1 : 0);
  const replayPacing = resolveRevealPacing(
    activeDrawIndex,
    sortedPrizes.length,
    activeReplayProduct
      ? resolveCeremonyTier(activeReplayProduct, sortedPrizes)
      : undefined,
  );
  const showBoxTeaser =
    playlistIndex != null && shouldPlayBoxTeaser(playlistIndex, sortedPrizes.length);
  const teaserVariant =
    playlistIndex === 0
      ? "full"
      : playlistIndex != null &&
          (isFinaleTeaser(playlistIndex, sortedPrizes.length) ||
            (showBoxTeaser && playlistIndex > 0))
        ? "mini"
        : "full";

  const finishInitialReveal = useCallback(() => {
    setPrizesUnveiled(true);
    markOrderRevealSeen(order.id);
    releaseRevealSession(order.id, "complete");
  }, [order.id]);

  const onReplayStepComplete = useCallback(() => {
    const completedProduct =
      playlistIndex != null ? sortedPrizes[playlistIndex] : sortedPrizes[sortedPrizes.length - 1];
    if (completedProduct) {
      const tier = normalizeQualityTier(completedProduct.qualityType);
      if (tier !== "GENERAL") {
        publishRevealRoomReaction(tier === "LEGENDARY" || tier === "LEGEND" ? "★" : "•");
      }
    }
    if (playlistIndex != null) {
      const product = sortedPrizes[playlistIndex];
      if (product?.id) {
        revealedIdsRef.current = [...revealedIdsRef.current, product.id];
      }
      const isInitialSequence = initialRevealBootRef.current === order.id;
      if (isInitialSequence) {
        if (playlistIndex < sortedPrizes.length - 1) {
          setPlaylistIndex(playlistIndex + 1);
        } else {
          setPlaylistIndex(null);
          releaseRevealSession(order.id, "complete");
          if (!prizesUnveiled) finishInitialReveal();
        }
        return;
      }
      const nextIdx = nextReplayPlaylistIndex(replayPlaylistIndices, playlistIndex);
      if (nextIdx != null) {
        setPlaylistIndex(nextIdx);
      } else if (replayMode === "loop" && replayPlaylistIndices.length > 0) {
        setPlaylistIndex(replayPlaylistIndices[0]!);
      } else {
        setPlaylistIndex(null);
        releaseRevealSession(order.id, "complete");
        if (!prizesUnveiled) finishInitialReveal();
      }
      return;
    }
    if (!prizesUnveiled) finishInitialReveal();
  }, [
    playlistIndex,
    sortedPrizes,
    prizesUnveiled,
    finishInitialReveal,
    order.id,
    replayPlaylistIndices,
    replayMode,
  ]);

  const reveal = usePrizeReveal({
    products: replayProducts.length ? replayProducts : prizeProducts.slice(0, 1),
    lowPerfMode,
    reduceMotion,
    reduceMotionLevel,
    autoReplay: false,
    soundEnabled,
    revealIndex: activeDrawIndex,
    totalReveals: sortedPrizes.length,
    showBoxTeaser,
    teaserVariant,
    pacing: replayPacing,
    drawProducts: sortedPrizes,
    prizeName: activeReplayProduct?.name,
    orderId: order.id,
    isReplaySession: prizesUnveiled,
    onRevealComplete: onReplayStepComplete,
  });
  const {
    motionDriver,
    showReveal,
    tier,
    profile,
    triggerReveal,
    skipReveal,
    accelerateReveal,
    handleSkipPress,
    staticFallback: revealStaticFallback,
  } = reveal;

  const replayBlocked = pendingPayment || showReveal || remoteReplayBlocked;
  const staticFallback = revealStaticFallback || integrityFailed || serverIntegrityFailed;
  useRevealGestureLock(showReveal && !staticFallback);

  useEffect(() => {
    if ((integrityFailed || serverIntegrityFailed) && needsInitialReveal && !prizesUnveiled) {
      finishInitialReveal();
    }
  }, [integrityFailed, serverIntegrityFailed, needsInitialReveal, prizesUnveiled, finishInitialReveal]);

  const detailsSequence = useRevealSequence({
    enabled: needsInitialReveal && sortedPrizes.length > 0 && !prizesUnveiled,
    orderId: order.id,
    source: "details",
    products: sortedPrizes,
    pendingPayment,
    onPlay: () => {
      resetRevealDriverTierForPaidReveal();
      initialRevealBootRef.current = order.id;
      setPlaylistIndex(0);
      setTimeout(() => triggerReveal(undefined, true), REVEAL_BOOT_DELAY_MS);
    },
    onSkipToPrizes: finishInitialReveal,
    onSkipToSettlement: finishInitialReveal,
    onQueued: finishInitialReveal,
    onOfflineBlocked: finishInitialReveal,
  });

  useRevealLifecycle({
    enabled: needsInitialReveal && !prizesUnveiled && playlistIndex != null,
    orderId: order.id,
    source: "details",
    revealIndex: playlistIndex ?? 0,
    revealedProductIds: revealedIdsRef.current,
    highlightMarkers: highlightMarkersRef.current,
    skipRemaining: false,
    phase: prizesUnveiled ? "idle" : "playing",
    onResumeFromProgress: (snap) => {
      if (snap.revealIndex > (playlistIndex ?? 0)) {
        setPlaylistIndex(snap.revealIndex);
        setTimeout(() => triggerReveal(undefined, true), REVEAL_BOOT_DELAY_MS);
      }
    },
  });

  useEffect(() => {
    if (playlistIndex == null || playlistIndex === 0) return;
    return detailsSequence.scheduleNextReveal({
      currentIndex: playlistIndex,
      total: sortedPrizes.length,
      ceremony: activeReplayProduct
        ? resolveCeremonyTier(activeReplayProduct, sortedPrizes)
        : undefined,
      trigger: () => triggerReveal(undefined, true),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [
    playlistIndex,
    triggerReveal,
    sortedPrizes,
    activeReplayProduct,
    detailsSequence.scheduleNextReveal,
  ]);

  useEffect(() => {
    if (!needsInitialReveal || sortedPrizes.length === 0) return;
    if (!validateRevealPrizes(sortedPrizes)) {
      finishInitialReveal();
      return;
    }
    if (reduceMotionLevel === "heavy") {
      finishInitialReveal();
    }
  }, [needsInitialReveal, sortedPrizes, reduceMotionLevel, finishInitialReveal]);

  useEffect(() => {
    if (reduceMotionLevel !== "heavy" || !needsInitialReveal) return;
    finishInitialReveal();
  }, [reduceMotionLevel, needsInitialReveal, finishInitialReveal]);

  useEffect(() => {
    if (!shouldAllowRevealPrefetch()) return;
    void prefetchRevealImages(
      sortedPrizes.map((p) => resolveProductImageUrl(p.id, p.name, p.cover)),
    );
  }, [sortedPrizes]);

  const revealSessionActive = Boolean(authToken) && (showReveal || playlistIndex != null);
  const roomSessionActive =
    Boolean(authToken) &&
    (revealSessionActive || (prizesUnveiled && sortedPrizes.length > 0 && !showReveal && playlistIndex == null));

  const detailsSpectatorPhase = useMemo(() => {
    if (staticFallback && revealSessionActive) return "summary";
    if (showReveal) return "playing";
    if (playlistIndex != null) return "gap";
    if (prizesUnveiled && sortedPrizes.length > 0) return "summary";
    return null;
  }, [staticFallback, revealSessionActive, showReveal, playlistIndex, prizesUnveiled, sortedPrizes.length]);

  const spectatorSyncEnabled =
    Boolean(authToken) && (revealSessionActive || (prizesUnveiled && sortedPrizes.length > 0));

  useEffect(() => {
    if (!roomSessionActive) return;
    void connectRevealRoom(order.id, authToken, "host");
    return () => leaveRevealHostRoom();
  }, [roomSessionActive, order.id, authToken]);

  useEffect(() => {
    if (!authToken || detailsSpectatorPhase == null) return;
    publishRevealRoomProgress({
      revealIndex: activeDrawIndex,
      total: sortedPrizes.length,
      phase: detailsSpectatorPhase,
    });
  }, [authToken, detailsSpectatorPhase, activeDrawIndex, sortedPrizes.length]);

  const { spectatorShareToken } = useRevealSpectatorSessionSync({
    enabled: spectatorSyncEnabled,
    authToken,
    orderId: order.id,
    boxId: order.items?.[0]?.mysteryBoxId ?? order.items?.[0]?.mysteryBox?.id,
    revealIndex: activeDrawIndex,
    total: sortedPrizes.length,
    products: sortedPrizes,
    currentProduct: activeReplayProduct,
    phase: detailsSpectatorPhase,
  });

  const skipReplayAll = () => {
    setPlaylistIndex(null);
    skipReveal("skip_one");
    if (!prizesUnveiled) finishInitialReveal();
  };

  const statusTheme = getOrderStatusTheme(order.status, themeColors);
  const payAmount = order.baseOrder?.payment?.payAmount;

  const topPrize = activeReplayProduct ?? prizeProducts[0];

  const guardManualReplay = async () => {
    if (!canGuestReplay(!!authToken)) {
      notifyGuestRevealBlocked("replay");
      return false;
    }
    const result = await recordManualReplay();
    if (!result.allowed) {
      toast.info(t("orderDetails.replayDailyCap"));
      return false;
    }
    if (result.degraded) {
      toast.info(t("orderDetails.replayDegradedHint"));
    }
    recordGuestReplay(!!authToken);
    return true;
  };

  const startReplayAll = () => {
    if (!replayPlaylistIndices.length || replayBlocked) return;
    void guardManualReplay().then((ok) => {
      if (!ok) return;
      if (!tryAcquireManualReplay(order.id, "details")) return;
      initialRevealBootRef.current = null;
      setPlaylistIndex(replayPlaylistIndices[0]!);
      skipReveal("skip_one");
      setTimeout(() => triggerReveal(undefined, true), REVEAL_BOOT_DELAY_MS);
    });
  };

  const replayFinale = () => {
    if (replayBlocked) return;
    void guardManualReplay().then((ok) => {
      if (!ok) return;
      if (!tryAcquireManualReplay(order.id, "details")) return;
      setPlaylistIndex(null);
      skipReveal("skip_one");
      setTimeout(() => triggerReveal(undefined, true), REVEAL_BOOT_DELAY_MS);
    });
  };
  const orderBoxName = getOrderBoxName(order);
  const boxCoverUri = getOrderBoxCover(order) || undefined;
  const topPrizeImage = topPrize
    ? resolveProductImageUrl(topPrize.id, topPrize.name, topPrize.cover) || undefined
    : undefined;
  const activeRevealIndex = playlistIndex ?? 0;
  const inMultiRevealSequence =
    sortedPrizes.length > 1 && needsInitialReveal && !prizesUnveiled && playlistIndex != null;
  const showRevealGapBackdrop = inMultiRevealSequence;

  return (
    <View style={styles.page}>
      {showRevealGapBackdrop ? <View style={styles.revealGapBackdrop} pointerEvents="none" /> : null}
      {staticFallback && showReveal ? (
        <RevealStaticFallback products={sortedPrizes} onSkip={skipReplayAll} />
      ) : motionDriver === "expo-go" ? (
        <RevealPlayer
          motionDriver="expo-go"
          fullScreen
          visible={showReveal && !staticFallback}
          tier={tier}
          profile={profile}
          onPressSkip={() => handleSkipPress?.()}
          onLongPressAccelerate={() => accelerateReveal(true)}
          prizeName={topPrize?.name}
          prizeImageUri={topPrizeImage}
          prizeQualityType={topPrize?.qualityType}
          boxCoverUri={boxCoverUri}
          showBoxTeaser={showBoxTeaser}
          teaserVariant={teaserVariant}
          subtitle={t("orderDetails.revealSubtitle")}
          skipParticles={skipParticlesReveal}
          atmosphereParticleScale={liveAtmosphereParticleScale}
          a11yFlashScale={a11yFlashScale}
          a11yLustreScale={a11yLustreScale}
        />
      ) : reveal.motionDriver === "reanimated" && !staticFallback ? (
        <RevealPlayer
          motionDriver="reanimated"
          fullScreen
          visible={showReveal}
          tier={tier}
          profile={profile}
          revealOpacity={reveal.revealOpacity}
          revealScale={reveal.revealScale}
          titlePunch={reveal.titlePunch}
          rainProgress={reveal.rainProgress}
          confettiProgress={reveal.confettiProgress}
          flashOpacity={reveal.flashOpacity}
          shakeX={reveal.shakeX}
          prizeCardScale={reveal.prizeCardScale}
          prizeCardOpacity={reveal.prizeCardOpacity}
          cardFlip={reveal.cardFlip}
          boxTeaserOpacity={reveal.boxTeaserOpacity}
          onPressSkip={() => handleSkipPress?.()}
          onLongPressAccelerate={() => accelerateReveal(true)}
          prizeName={topPrize?.name}
          prizeImageUri={topPrizeImage}
          prizeQualityType={topPrize?.qualityType}
          boxCoverUri={boxCoverUri}
          showBoxTeaser={showBoxTeaser}
          teaserVariant={teaserVariant}
          subtitle={t("orderDetails.revealSubtitle")}
          skipParticles={skipParticlesReveal}
          atmosphereParticleScale={liveAtmosphereParticleScale}
          a11yFlashScale={a11yFlashScale}
          a11yLustreScale={a11yLustreScale}
        />
      ) : null}
      {showReveal ? <View style={styles.gestureShield} pointerEvents="box-none" /> : null}
      <RevealSequenceChrome
        visible={showReveal && playlistIndex != null}
        revealIndex={activeRevealIndex}
        revealProducts={sortedPrizes}
        orderId={order.id}
        onSkipCurrent={() => handleSkipPress?.()}
        onSkipRemaining={sortedPrizes.length > 1 ? skipReplayAll : undefined}
        onTurboToggle={(enabled) => {
          if (enabled) accelerateReveal(true);
        }}
      />
      <ProductStorySheet visible={!!storySheet} story={storySheet} onClose={() => setStorySheet(null)} />
      <SubPageHeader title={t("orderDetails.title")} onBack={onBack} />
      <ScreenScaffold
        contentContainerStyle={
          isTablet ? { ...styles.container, ...styles.containerTablet } : styles.container
        }
        refreshControl={
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.brand}
            enabled={!gestureLocked}
          />
        }
      >
        <OrderDetailsHeader
          statusLabel={getOrderStatusLabel(order.status)}
          statusTheme={statusTheme}
          payAmountText={formatCurrencyOptional(typeof payAmount === "number" ? payAmount : null)}
          canPay={canPay}
          authToken={authToken}
          orderId={order.id}
          countdownPrefix={countdownLabels.prefix}
          countdownExpiredLabel={countdownLabels.expiredLabel}
          styles={styles}
        />

        <OrderDetailsTimeline
          order={order}
          carrierLabel={carrierLabel}
          trackingNumber={trackingNumber}
          logistics={logistics}
          logisticsLoading={logisticsLoading}
          logisticsError={logisticsError}
          reloadAuxiliary={reloadAuxiliary}
          styles={styles}
        />

        {prizesUnveiled ? (
          <OrderShareCard
            order={order}
            topPrizeName={topPrize?.name}
            onSharePoster={() => setSharePosterVisible(true)}
            onShareCommunity={
              onShareToCommunity
                ? () => onShareToCommunity(buildOrderCommunityDraft(t, order, topPrize?.name))
                : undefined
            }
          />
        ) : null}

        <OrderDetailsActions
          canPay={canPay}
          canApplyRefund={canApplyRefund}
          canConfirmReceive={canConfirmReceive}
          canCancel={canCancel}
          refundSubmitting={refundSubmitting}
          pendingPayment={pendingPayment}
          hasPrizes={sortedPrizes.length > 0}
          onPay={() => void confirmPayWithOdds()}
          onRefund={() => void submitRefund()}
          onConfirmReceive={() => onConfirmReceive?.(order.id)}
          onCancel={() => onCancel(order.id)}
          confirmReceive={confirm}
          styles={styles}
        />

        <OrderDetailsPrizes
          orderId={order.id}
          prizesUnveiled={prizesUnveiled}
          immersiveReplay={immersiveReplay}
          showReveal={showReveal}
          prizeProducts={prizeProducts}
          prizeDuplicateMeta={prizeDuplicateMeta}
          isTablet={isTablet}
          replayBlocked={replayBlocked}
          replayPref={replayPref}
          replayPlaylistIndices={replayPlaylistIndices}
          onReplayFinale={replayFinale}
          onReplayAll={startReplayAll}
          onStory={setStorySheet}
          styles={styles}
        />

      {showReveal ? <RevealReactionTicker visible testID="revealReactionTicker" /> : null}
      {showReveal ? <RevealLocalDanmaku visible={showReveal} useRoomReactions /> : null}

      </ScreenScaffold>
      <SharePosterModal
        visible={sharePosterVisible}
        boxName={orderBoxName}
        orderId={order.id}
        drawCount={order.items?.[0]?.mysteryBoxCount ?? 1}
        topPrizeName={topPrize?.name}
        authToken={authToken}
        spectatorShareToken={spectatorShareToken}
        boxId={order.items?.[0]?.mysteryBoxId ?? order.items?.[0]?.mysteryBox?.id}
        onClose={() => setSharePosterVisible(false)}
      />
    </View>
  );
}
