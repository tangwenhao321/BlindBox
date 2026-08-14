import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useLoopPulse } from "../effects/reanimated/useLoopPulse";
import { rnSpring } from "../effects/reanimated/springConfig";
import type { Product } from "../types";
import { useOrderResultReveal } from "../hooks/useOrderResultReveal";
import { RevealShareCard } from "./RevealShareCard";
import { OrderResultSettlementSheet } from "./OrderResultSettlementSheet";
import { OrderResultRevealPhase } from "./OrderResultRevealPhase";
import { RevealBatchBeat } from "./ui/RevealBatchBeat";
import { RevealAchievementToast } from "./ui/RevealAchievementToast";
import { evaluateRevealAchievements } from "../effects/revealAchievements";
import { trackEvent } from "../utils/analytics";
import { normalizeQualityTier } from "../utils/quality";
import { captureRevealHighlightVideo, shareRevealHighlight } from "../utils/captureRevealHighlightVideo";
import { resolveSpectatorShareToken } from "../services/spectatorService";
import { buildLiveSpectatorSnapshot } from "../effects/revealSpectatorSnapshot";
import { appViewToHref } from "../navigation/appViewRoutes";
import { recordShareAchievement } from "../effects/revealShareAchievements";
import * as ExpoLinking from "expo-linking";
import { toast } from "../utils/toast";
import { applyAppChrome } from "../utils/appChrome";
import { useAppTheme } from "../context/ThemeContext";
import { RevealPreferencePrompt } from "./RevealPreferencePrompt";
import { shouldAskRevealPreference, markRevealPreferenceAsked } from "../utils/revealPromptStorage";
import { setRevealAnimationsEnabled, setRevealTextOnlyMode } from "../utils/revealSettings";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import { RevealCoachTips } from "./ui/RevealCoachTips";

type Props = {
  visible: boolean;
  orderId: string;
  authToken?: string;
  boxName: string;
  boxId?: string;
  boxCategoryName?: string;
  boxCover?: string;
  drawCount: number;
  payAmount: number;
  prizes: Product[];
  onClose: () => void;
  onViewOrders: () => void;
  onPayNow: () => void;
  onTryAgain: () => void;
  onGoWarehouse?: () => void;
  onVerifyFairness?: () => void;
  onShare: () => void;
  showPayButton?: boolean;
  pendingPayment?: boolean;
  revealPlaybackKey?: number;
};

export function OrderResultModal(props: Props) {
  return (
    <Suspense fallback={null}>
      <OrderResultModalInner {...props} />
    </Suspense>
  );
}

function OrderResultModalInner(props: Props) {
  const {
    visible,
    orderId,
    authToken,
    boxName,
    boxCover,
    boxId,
    boxCategoryName,
    drawCount,
    payAmount,
    prizes,
    onClose,
    onViewOrders,
    onPayNow,
    onTryAgain,
    onGoWarehouse,
    onVerifyFairness,
    onShare,
    showPayButton = true,
    pendingPayment = false,
    revealPlaybackKey = 0,
  } = props;
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const [sharing, setSharing] = useState(false);
  const [shareWatermark, setShareWatermark] = useState<{ text?: string; code?: string } | null>(null);
  const [revealPromptVisible, setRevealPromptVisible] = useState(false);
  const [achievement, setAchievement] = useState<ReturnType<typeof evaluateRevealAchievements>[number] | null>(null);
  const shareCardRef = useRef<View>(null);
  const sharePulse = useSharedValue(1);
  const legendCount = prizes.filter((item) => normalizeQualityTier(item.qualityType) === "LEGENDARY").length;
  const glow = useLoopPulse(visible && !pendingPayment, 700);
  const legendPulse = useLoopPulse(visible && !pendingPayment && legendCount > 0, 600);
  useAppPublicConfig({ boxId, categoryId: boxCategoryName, themeId: undefined });
  const reveal = useOrderResultReveal({
    visible,
    pendingPayment,
    prizes,
    boxName,
    boxCover,
    boxId,
    boxCategoryName,
    orderId,
    authToken,
    revealPlaybackKey,
    onForceClose: onClose,
  });
  const {
    revealProducts,
    revealIndex,
    showSummary,
    highlightProductId,
    highlightPulse,
    rarityStats,
    currentRevealProduct,
    currentPrizeImage,
    revealCycleKey,
    pacing,
    showBoxTeaser,
    teaserVariant,
    boxCoverUri,
    skipCurrent,
    skipRemaining,
    handleSkipPress,
    dismissSummary,
    accelerateReveal,
    reduceMotion,
    reduceMotionLevel,
    degradeLevel,
    skipParticles,
    skipTeaserAnim,
    collectionEasterEgg,
    motionDriver,
    showReveal,
    sequenceDone,
    tier,
    profile,
    revealTheme,
    handleModalDismiss,
    showBatchBeat,
    batchBeatSegment,
    dismissBatchBeat,
    queueLength,
    staticFallback,
    a11yFlashScale,
    a11yLustreScale,
    spectatorShareToken,
    atmosphereParticleScale,
    pityProgress,
    refetchPityProgress,
  } = reveal;

  const shareProduct = useMemo(() => {
    if (!prizes.length) return null;
    const tierRank = (p: Product) => {
      const t = normalizeQualityTier(p.qualityType);
      if (t === "LEGENDARY" || t === "LEGEND") return 0;
      if (t === "HIDDEN" || t === "EPIC") return 1;
      return 2;
    };
    return [...prizes].sort((a, b) => tierRank(a) - tierRank(b))[0];
  }, [prizes]);

  const handleShareReveal = useCallback(async () => {
    if (!shareProduct || sharing) return;
    setSharing(true);
    trackEvent("share_reveal", { orderId, productId: shareProduct.id });
    try {
      let deepLink: string | undefined;
      if (authToken) {
        const snapshot = buildLiveSpectatorSnapshot({
          revealIndex,
          total: revealProducts.length,
          products: revealProducts,
          current: shareProduct,
        });
        const spectatorToken = await resolveSpectatorShareToken(authToken, orderId, spectatorShareToken, {
          phase: showSummary ? "summary" : "playing",
          snapshot,
        });
        deepLink = spectatorToken
          ? ExpoLinking.createURL(appViewToHref("revealSpectator", { spectatorToken }))
          : undefined;
      }
      await new Promise((r) => setTimeout(r, 120));
      sharePulse.value = withSequence(
        withTiming(1.06, { duration: 180 }),
        withSpring(1, rnSpring(5, 110)),
      );
      await new Promise((r) => setTimeout(r, 220));
      const watermarkCode = `${orderId.slice(-6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
      setShareWatermark({ text: shareProduct.name, code: watermarkCode });
      await new Promise((r) => setTimeout(r, 80));
      const captured = await captureRevealHighlightVideo(shareCardRef, {
        watermarkText: shareProduct.name,
        watermarkCode,
      });
      setShareWatermark(null);
      if (!captured) {
        toast.error(t("orderResult.shareCaptureFailed"));
        return;
      }
      const shareMessage = deepLink
        ? t("orderResult.shareSpectatorMessage", { url: deepLink })
        : t("orderResult.shareHighlightMessage");
      await shareRevealHighlight(captured, { message: shareMessage, url: deepLink });
      await recordShareAchievement("rare_share");
      toast.success(
        captured.kind === "video"
          ? t("orderResult.shareHighlightVideoSuccess")
          : t("orderResult.shareHighlightImageSuccess"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("orderResult.shareFailed"));
    } finally {
      setSharing(false);
    }
  }, [
    shareProduct,
    sharing,
    orderId,
    sharePulse,
    t,
    authToken,
    showSummary,
    revealIndex,
    revealProducts,
    spectatorShareToken,
  ]);
  const shareCardStyle = useAnimatedStyle(() => ({ transform: [{ scale: sharePulse.value }] }));
  const legendBurstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(legendPulse.value, [0, 1], [0.35, 0.85]),
  }));
  useEffect(() => {
    if (visible) {
      trackEvent("order_result_modal_show", { orderId, drawCount, payAmount });
    }
  }, [visible, orderId, drawCount, payAmount]);

  const showSettlementSheet =
    !showReveal && !showSummary && !pendingPayment && (sequenceDone || prizes.length === 0);

  useEffect(() => {
    if (!visible) {
      setRevealPromptVisible(false);
      setAchievement(null);
      void applyAppChrome({ colors, isDark });
    }
  }, [visible, colors, isDark]);

  useEffect(() => {
    if (!visible || pendingPayment || prizes.length === 0 || !showSummary) return;
    void shouldAskRevealPreference().then((ask) => {
      if (ask) setRevealPromptVisible(true);
    });
  }, [visible, pendingPayment, prizes.length, showSummary]);

  useEffect(() => {
    if (!visible || !showSummary || pendingPayment) return;
    const items = evaluateRevealAchievements({
      products: revealProducts,
      allProducts: revealProducts,
      seriesCollected: collectionEasterEgg.collected,
      seriesTotal: collectionEasterEgg.totalInSeries,
    });
    setAchievement(items[0] ?? null);
  }, [visible, showSummary, pendingPayment, revealProducts, collectionEasterEgg]);

  const inMultiRevealSequence =
    visible &&
    !pendingPayment &&
    !showSummary &&
    !sequenceDone &&
    revealProducts.length > 1 &&
    (showReveal || showBatchBeat);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleModalDismiss}
      testID="orderResultModal"
    >
      <View
        style={[
          styles.modalRoot,
          inMultiRevealSequence ? styles.modalRootRevealSequence : null,
        ]}
        pointerEvents="box-none"
      >
      <OrderResultRevealPhase
        pendingPayment={pendingPayment}
        showReveal={showReveal}
        showSummary={showSummary}
        sequenceDone={sequenceDone}
        motionDriver={motionDriver}
        revealMotionDriver={reveal.motionDriver}
        revealCycleKey={revealCycleKey}
        revealPlayToken={reveal.revealPlayToken}
        revealIndex={revealIndex}
        orderId={orderId}
        revealProducts={revealProducts}
        tier={tier}
        profile={profile}
        pacing={pacing}
        showBoxTeaser={showBoxTeaser}
        teaserVariant={teaserVariant}
        currentRevealProduct={currentRevealProduct}
        currentPrizeImage={currentPrizeImage}
        boxCoverUri={boxCoverUri}
        boxId={boxId}
        revealTheme={revealTheme}
        reanimatedReveal={
          reveal.motionDriver === "reanimated"
            ? {
                revealOpacity: reveal.revealOpacity,
                revealScale: reveal.revealScale,
                titlePunch: reveal.titlePunch,
                rainProgress: reveal.rainProgress,
                confettiProgress: reveal.confettiProgress,
                flashOpacity: reveal.flashOpacity,
                shakeX: reveal.shakeX,
                prizeCardScale: reveal.prizeCardScale,
                prizeCardOpacity: reveal.prizeCardOpacity,
                cardFlip: reveal.cardFlip,
                boxTeaserOpacity: reveal.boxTeaserOpacity,
              }
            : undefined
        }
        rarityStats={rarityStats}
        legendCount={legendCount}
        legendBurstStyle={legendBurstStyle}
        skipCurrent={skipCurrent}
        skipRemaining={skipRemaining}
        handleSkipPress={handleSkipPress}
        accelerateReveal={accelerateReveal}
        handleAcceleratePressIn={reveal.handleAcceleratePressIn}
        handleAcceleratePressOut={reveal.handleAcceleratePressOut}
        accelerateProgress={reveal.accelerateProgress}
        isAccelerating={reveal.isAccelerating}
        accelerateSpeedLabel={reveal.accelerateSpeedLabel}
        revealPlayState={reveal.revealPlayState}
        reduceMotionLevel={reduceMotionLevel}
        degradeLevel={degradeLevel}
        skipParticles={skipParticles}
        atmosphereParticleScale={atmosphereParticleScale}
        skipTeaserAnim={skipTeaserAnim}
        collectionEasterEgg={collectionEasterEgg}
        dismissSummary={dismissSummary}
        onGoWarehouse={onGoWarehouse}
        onTryAgain={onTryAgain}
        onVerifyFairness={onVerifyFairness}
        onShareHighlight={() => void handleShareReveal()}
        reduceMotion={reduceMotion}
        queueLength={queueLength}
        staticFallback={staticFallback}
        a11yFlashScale={a11yFlashScale}
        a11yLustreScale={a11yLustreScale}
      />
      <RevealBatchBeat
        visible={showBatchBeat}
        segmentIndex={batchBeatSegment.current}
        segmentTotal={batchBeatSegment.total}
        orderId={orderId}
        onDone={dismissBatchBeat}
      />
      <RevealAchievementToast
        achievement={achievement}
        onDismiss={() => setAchievement(null)}
        onOpenCollection={onGoWarehouse}
      />
      {(showSettlementSheet || pendingPayment) ? (
        <OrderResultSettlementSheet
          pendingPayment={pendingPayment}
          orderId={orderId}
          authToken={authToken}
          boxName={boxName}
          boxId={boxId}
          drawCount={drawCount}
          payAmount={payAmount}
          prizes={prizes}
          legendCount={legendCount}
          glow={glow}
          highlightProductId={highlightProductId}
          highlightPulse={highlightPulse}
          showPayButton={showPayButton}
          sharing={sharing}
          onClose={onClose}
          onViewOrders={onViewOrders}
          onPayNow={onPayNow}
          onTryAgain={onTryAgain}
          onGoWarehouse={onGoWarehouse}
          onVerifyFairness={onVerifyFairness}
          onShareHighlight={() => void handleShareReveal()}
          onSharePoster={onShare}
          revealTheme={revealTheme}
          reduceMotion={reduceMotion}
          pityCompensateStatus={pityProgress?.compensateStatus}
          onPityCompleted={refetchPityProgress}
        />
      ) : null}
      <RevealCoachTips active={visible && !pendingPayment && (showReveal || showSettlementSheet)} />
      {shareProduct ? (
        <View style={styles.offscreenShare} pointerEvents="none">
          <Animated.View style={shareCardStyle}>
            <RevealShareCard
              ref={shareCardRef}
              boxName={boxName}
              boxId={boxId}
              product={shareProduct}
              revealTheme={revealTheme}
              exportAspect="share"
              watermarkText={shareWatermark?.text}
              watermarkCode={shareWatermark?.code}
            />
          </Animated.View>
        </View>
      ) : null}
      <RevealPreferencePrompt
        visible={revealPromptVisible}
        onKeepAnimations={() => {
          void markRevealPreferenceAsked();
          setRevealPromptVisible(false);
        }}
        onTextOnly={() => {
          void markRevealPreferenceAsked();
          void setRevealTextOnlyMode(true);
          void setRevealAnimationsEnabled(false);
          setRevealPromptVisible(false);
        }}
      />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  modalRootRevealSequence: {
    backgroundColor: "rgba(10, 8, 7, 0.97)",
  },
  offscreenShare: { position: "absolute", left: -9999, top: 0, opacity: 0.01 },
});
