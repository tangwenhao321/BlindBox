import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Clipboard, Pressable, RefreshControl, StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";
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
import { revealLayerZIndex } from "../effects/revealLayerZIndex";
import { REVEAL_BOOT_DELAY_MS } from "../effects/revealSessionController";
import { prefetchRevealImages } from "../utils/imagePrefetch";
import { usePrizeReveal } from "../hooks/usePrizeReveal";
import { useRevealDevice } from "../hooks/useRevealDevice";
import { useRevealGestureLock, isRevealGestureLocked, subscribeRevealGestureLock } from "../effects/revealGestureLock";
import { getOrderBoxCover, getOrderBoxName, getOrderStatusLabel, getOrderStatusTheme, getOrderTimeLabel, formatOrderIdDisplay } from "../order-utils";
import { SubPageHeader } from "./ui/SubPageHeader";
import { PrimaryButton } from "./ui/PrimaryButton";
import { EmptyState } from "./EmptyState";
import { SectionHeading } from "./ui/SectionHeading";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
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
} from "../effects/revealOrchestrator";
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
import { OrderPrizeCard } from "./OrderPrizeCard";
import { RevealLocalDanmaku } from "./ui/RevealLocalDanmaku";
import { RevealReactionTicker } from "./ui/RevealReactionTicker";
import { RevealPlayer } from "./ui/RevealPlayer";
import { RevealSequenceChrome } from "./ui/RevealSequenceChrome";
import { RevealStaticFallback } from "./ui/RevealStaticFallback";
import { ProductStorySheet } from "./ui/ProductStorySheet";
import { resolveProductStory } from "../effects/revealProductStory";
import type { ProductStory } from "../effects/revealProductStory";
import { shouldShowReturnWelcome, markReturnWelcomeShown } from "../effects/revealReturnWelcome";
import { OrderShareCard } from "./OrderShareCard";
import { SharePosterModal } from "./SharePosterModal";
import { buildOrderCommunityDraft } from "../utils/orderShareDraft";
import { useAuthToken } from "../hooks/useAuthToken";
import { useOrderDetailsAuxiliary } from "../hooks/useOrderDetailsAuxiliary";
import { InlineSectionError } from "./ui/InlineSectionError";
import { ListSkeleton } from "./ListSkeleton";
import { toast } from "../utils/toast";
import { formatCurrency, formatCurrencyDiscount, formatCurrencyOptional } from "../utils/formatCurrency";
import { resolveProductImageUrl } from "../utils/boxImage";
import { recordManualReplay } from "../effects/revealReplayLimiter";
import { canGuestReplay, notifyGuestRevealBlocked, recordGuestReplay } from "../effects/revealGuestPolicy";
import {
  releaseRevealSession,
  tryAcquireManualReplay,
} from "../effects/revealOrchestrator";
import { useRevealLifecycle } from "../hooks/useRevealLifecycle";
import { PayCountdownText } from "./ui/PayCountdownText";
import { openContactSupport } from "../utils/contactSupport";
import { resolveCarrierLabel } from "../utils/carrierLabel";
import { usePendingPaymentCountdownLabels } from "../hooks/usePendingPaymentCountdownLabels";
import type { Order } from "../types";

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
  const integrityToastRef = useRef(false);
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
        <View style={styles.statusRow}>
          <Text style={[styles.statusChip, { backgroundColor: statusTheme.bg, color: statusTheme.text, borderColor: statusTheme.border }]}>
            {getOrderStatusLabel(order.status)}
          </Text>
          <Text style={styles.payAmount}>{formatCurrencyOptional(typeof payAmount === "number" ? payAmount : null)}</Text>
        </View>
        {canPay && authToken ? (
          <PayCountdownText
            authToken={authToken}
            orderId={order.id}
            prefix={countdownLabels.prefix}
            expiredLabel={countdownLabels.expiredLabel}
            style={styles.payDeadline}
          />
        ) : null}

        <View style={styles.summaryCard}>
          <SummaryRow styles={styles} label={t("orderDetails.boxLabel")} value={getOrderBoxName(order)} />
          <SummaryRow styles={styles} label={t("orderDetails.orderTime")} value={getOrderTimeLabel(order)} />
          <SummaryRow styles={styles} label={t("orderDetails.quantity")} value={String(order.items?.[0]?.mysteryBoxCount ?? "—")} />
          {order.baseOrder?.payment?.couponAmount ? (
            <SummaryRow styles={styles} label={t("orderDetails.couponLabel")} value={formatCurrencyDiscount(order.baseOrder.payment.couponAmount)} />
          ) : null}
          {order.baseOrder?.payment?.deliveryFee != null && order.baseOrder.payment.deliveryFee > 0.009 ? (
            <SummaryRow styles={styles} label={t("orderDetails.deliveryFee")} value={formatCurrency(order.baseOrder.payment.deliveryFee)} />
          ) : null}
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>{t("orderDetails.orderId")}</Text>
            <Pressable
              onPress={() => {
                Clipboard.setString(order.id);
                toast.success(t("orderDetails.orderIdCopied"));
              }}
              accessibilityRole="button"
              accessibilityLabel={t("orderDetails.copy")}
            >
              <Text style={styles.idValue}>{formatOrderIdDisplay(order.id)} {t("orderDetails.copy")}</Text>
            </Pressable>
          </View>
          {trackingNumber ? (
            <>
              {carrierLabel ? (
                <SummaryRow styles={styles} label={t("orderDetails.carrierLabel")} value={carrierLabel} />
              ) : null}
              <View style={styles.idRow}>
                <Text style={styles.idLabel}>{t("orderDetails.trackingNo")}</Text>
                <Pressable
                  onPress={() => {
                    Clipboard.setString(trackingNumber);
                    toast.success(t("orderDetails.trackingCopied"));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("orderDetails.copyTrackingA11y")}
                >
                  <Text style={styles.idValue}>
                    {trackingNumber} · {t("orderDetails.copy")}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.logisticsCard}>
                <Text style={styles.logisticsTitle}>{t("orderDetails.logisticsTimeline")}</Text>
                {logisticsLoading ? <ListSkeleton variant="row" rows={2} /> : null}
                {logisticsError ? (
                  <InlineSectionError
                    message={t("orderDetails.logisticsLoadFailed", { message: logisticsError })}
                    onRetry={() => void reloadAuxiliary()}
                    onContactSupport={() => void openContactSupport()}
                  />
                ) : null}
                {!logisticsLoading && !logisticsError
                  ? (logistics.length ? logistics : []).map((event, index) => {
                      const sourceLabel =
                        event.source === "KUAIDI100"
                          ? t("orderDetails.logisticsSourceKuaidi100")
                          : event.source === "MANUAL"
                            ? t("orderDetails.logisticsSourceManual")
                            : event.source
                              ? t("orderDetails.logisticsSourceLocal")
                              : null;
                      return (
                        <Text key={`${event.status}-${index}`} style={styles.logisticsStep}>
                          {index === 0 ? "●" : "○"} {event.description}
                          {sourceLabel ? ` · ${sourceLabel}` : null}
                        </Text>
                      );
                    })
                  : null}
                {!logisticsLoading && !logisticsError && !logistics.length ? (
                  <Text style={styles.logisticsStep}>● {t("orderDetails.logisticsInTransit")}</Text>
                ) : null}
                <Text style={styles.logisticsHint}>
                  {logistics.some((e) => e.source === "KUAIDI100")
                    ? t("orderDetails.logisticsMerged")
                    : t("orderDetails.logisticsManual")}
                </Text>
              </View>
            </>
          ) : order.status === ORDER_STATUS.TO_BE_RECEIVED || order.status === ORDER_STATUS.TO_BE_DELIVERED ? (
            <SummaryRow styles={styles} label={t("orderDetails.logisticsLabel")} value={t("orderDetails.logisticsPending")} />
          ) : null}
        </View>

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

        <View style={styles.actions}>
          {canPay ? (
            <PrimaryButton
              label={t("orderDetails.payNow")}
              accessibilityLabel={t("orderDetails.payNowA11y")}
              onPress={() => onPay(order.id)}
            />
          ) : null}
          {canConfirmReceive ? (
            <PrimaryButton
              label={t("orderDetails.confirmReceive")}
              onPress={async () => {
                const ok = await confirm({
                  title: t("orderDetails.confirmReceiveTitle"),
                  message: t("orderDetails.confirmReceiveMessage"),
                  confirmLabel: t("orderDetails.confirmReceive"),
                });
                if (ok) {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onConfirmReceive?.(order.id);
                }
              }}
            />
          ) : null}
          {canCancel ? (
            <PrimaryButton label={t("orderDetails.cancelUnpaid")} variant="ghost" onPress={() => onCancel(order.id)} />
          ) : null}
        </View>

        {pendingPayment && sortedPrizes.length > 0 ? (
          <Text style={styles.pendingPaymentHint}>{t("orderDetails.pendingPaymentHint")}</Text>
        ) : null}

        {!prizesUnveiled ? (
          <View style={styles.prizeFreezeMask} pointerEvents="none">
            <View style={styles.prizePlaceholder}>
              <SectionHeading title={t("orderDetails.prizesSection")} />
              <Text style={styles.prizeFrozenHint}>{t("orderDetails.revealInProgress")}</Text>
            </View>
          </View>
        ) : null}

        {prizesUnveiled && !(immersiveReplay && showReveal) ? (
          <View style={styles.prizeBlock}>
            <View style={styles.prizeHeaderRow}>
              <SectionHeading title={t("orderDetails.prizesSection")} />
              <View style={styles.replayBtnRow}>
                <Pressable
                  style={[styles.replayButton, replayBlocked ? styles.replayButtonDisabled : null]}
                  onPress={replayFinale}
                  disabled={replayBlocked}
                  accessibilityRole="button"
                  accessibilityLabel={t("orderDetails.replayFinale")}
                >
                  <Text style={styles.replayText}>{t("orderDetails.replayFinale")}</Text>
                </Pressable>
                {sortedPrizes.length > 1 &&
                (replayPref === "all" ||
                  (replayPref === "highlights" && replayPlaylistIndices.length > 1)) ? (
                  <Pressable
                    style={[styles.replayButton, replayBlocked ? styles.replayButtonDisabled : null]}
                    onPress={startReplayAll}
                    disabled={replayBlocked}
                    accessibilityRole="button"
                    accessibilityLabel={t("orderDetails.replayAll")}
                  >
                    <Text style={styles.replayText}>{t("orderDetails.replayAll")}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            {hasOrderRevealBeenSeen(order.id) ? (
              <Text style={styles.sessionReplayHint}>{t("orderDetails.sessionAutoPlayDone")}</Text>
            ) : null}
            {prizeProducts.length === 0 ? (
              <EmptyState title={t("orderDetails.emptyPrizesTitle")} description={t("orderDetails.emptyPrizesDesc")} variant="plain" />
            ) : (
              <View style={isTablet ? styles.prizeGrid : undefined}>
                {prizeProducts.map((product, index) => (
                  <View key={`${product.id}-${index}`} style={isTablet ? styles.prizeGridItem : undefined}>
                    <OrderPrizeCard
                      product={product}
                      duplicateIndex={prizeDuplicateMeta[index]?.duplicateIndex}
                      duplicateCount={prizeDuplicateMeta[index]?.duplicateCount}
                      onLongPressStory={() => setStorySheet(resolveProductStory(product.id, product.name))}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

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

function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: {
    summaryRow: ViewStyle;
    summaryLabel: TextStyle;
    summaryValue: TextStyle;
  };
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function buildOrderDetailsStyles(colors: ThemeColors) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPage },
  gestureShield: {
    ...StyleSheet.absoluteFillObject,
    zIndex: revealLayerZIndex.skipBar,
  },
  container: { paddingBottom: layout.screenPaddingBottom },
  containerTablet: { maxWidth: 720, alignSelf: "center", width: "100%" },
  prizeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  prizeGridItem: { width: "48%" },
  refundBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.successSoftBorder,
    gap: 4,
  },
  refundBannerTitle: { fontWeight: "800", color: colors.successStrong, fontSize: typography.body },
  refundBannerSub: { color: colors.textSecondary, fontSize: typography.caption },
  integrityBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    gap: 4,
  },
  integrityTitle: { fontWeight: "800", color: colors.danger, fontSize: typography.body },
  integritySub: { color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontWeight: "800",
    fontSize: typography.caption,
  },
  payAmount: { fontSize: typography.h3, fontWeight: "900", color: colors.textPrimary },
  payDeadline: { marginBottom: spacing.sm, color: colors.brand, fontWeight: "700", fontSize: typography.caption },
  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  summaryLabel: { color: colors.textSecondary, fontSize: typography.caption },
  summaryValue: { flex: 1, textAlign: "right", color: colors.textPrimary, fontWeight: "700", fontSize: typography.caption },
  idRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.xs },
  idLabel: { color: colors.textSecondary, fontSize: typography.caption },
  idValue: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
  logisticsCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  logisticsTitle: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.caption },
  logisticsStep: { color: colors.textSecondary, fontSize: typography.micro, lineHeight: 18 },
  logisticsHint: { marginTop: spacing.xs, color: colors.textMuted, fontSize: typography.micro },
  actions: { gap: spacing.sm, marginBottom: spacing.lg },
  prizeBlock: { marginTop: spacing.xl, marginBottom: spacing.sm },
  prizeHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  replayBtnRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  controlsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  replayButton: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    backgroundColor: colors.bgBrandSoft,
  },
  replayText: { color: colors.brand, fontSize: typography.caption, fontWeight: "700" },
  sessionReplayHint: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.micro,
  },
  replayButtonDisabled: { opacity: 0.45 },
  pendingPaymentHint: {
    marginBottom: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  prizeFreezeMask: {
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  prizePlaceholder: {
    padding: spacing.lg,
    gap: spacing.sm,
    opacity: 0.55,
  },
  prizeFrozenHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  skipRevealBar: {
    position: "absolute",
    top: 56,
    right: spacing.lg,
    zIndex: 2100,
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  skipRevealFloating: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  skipRevealText: { color: "#FFFFFF", fontWeight: "800" },
  revealGapBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 8, 18, 0.94)",
    zIndex: revealLayerZIndex.gapBackdrop,
  },
  });
}

