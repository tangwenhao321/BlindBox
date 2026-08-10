import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { type SharedValue, type AnimatedStyle, runOnJS, useAnimatedReaction } from "react-native-reanimated";
import type { StyleProp, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import type { EffectProfile } from "../effects/config";
import type { RevealPacing } from "../effects/revealSequence";
import type { Product } from "../types";
import { useThemedStyles } from "../hooks/useThemedStyles";
import type { RevealTheme } from "../effects/revealTheme";
import type { ReduceMotionLevel } from "../effects/revealRemote";
import { RevealFeedTicker } from "./ui/RevealFeedTicker";
import { RevealReactionTicker } from "./ui/RevealReactionTicker";
import { RevealLocalDanmaku } from "./ui/RevealLocalDanmaku";
import { RevealCollectionHint } from "./ui/RevealCollectionHint";
import { RevealPlayStateIndicator, type RevealPlayState } from "./ui/RevealPlayStateIndicator";
import { LustreLegendFlashOverlay } from "./ui/LustreLegendFlashOverlay";
import { RevealSequenceChrome } from "./ui/RevealSequenceChrome";
import { RevealStaticFallback } from "./ui/RevealStaticFallback";
import { getRevealFocusMode } from "../effects/revealFocusMode";
import { useRevealGestureLock } from "../effects/revealGestureLock";
import { RevealOverlay } from "./ui/RevealOverlay";
import { RevealSummaryBurst } from "./ui/RevealSummaryBurst";
import { RevealHighlightsPanel } from "./ui/RevealHighlightsPanel";
import { DisabledOverlay } from "./ui/DisabledOverlay";
import type { ThemeColors } from "../styles/themes";
import { revealLayerZIndex } from "../effects/revealLayerZIndex";
import { resolveRecordingSafeRevealFlags } from "../effects/revealRecordingMode";
import { isRevealMinorModeActive } from "../effects/revealMinorMode";

type ReanimatedRevealValues = {
  revealOpacity: SharedValue<number>;
  revealScale: SharedValue<number>;
  titlePunch: SharedValue<number>;
  rainProgress: SharedValue<number>;
  confettiProgress: SharedValue<number>;
  flashOpacity: SharedValue<number>;
  shakeX: SharedValue<number>;
  prizeCardScale: SharedValue<number>;
  prizeCardOpacity: SharedValue<number>;
  cardFlip: SharedValue<number>;
  boxTeaserOpacity: SharedValue<number>;
};

type Props = {
  pendingPayment: boolean;
  showReveal: boolean;
  showSummary: boolean;
  sequenceDone?: boolean;
  motionDriver: "expo-go" | "reanimated";
  revealMotionDriver: "expo-go" | "reanimated";
  revealCycleKey: number;
  revealPlayToken?: number;
  revealIndex: number;
  revealProducts: Product[];
  orderId?: string;
  tier: string;
  profile: EffectProfile;
  pacing?: RevealPacing;
  showBoxTeaser?: boolean;
  teaserVariant?: "full" | "mini";
  currentRevealProduct?: Product;
  currentPrizeImage?: string;
  boxCoverUri?: string;
  boxId?: string;
  revealTheme?: RevealTheme;
  reanimatedReveal?: ReanimatedRevealValues;
  rarityStats: {
    total: number;
    legendary: number;
    hidden: number;
    treasureLegend: number;
    peerless: number;
    treasurePeerless: number;
  };
  legendCount: number;
  legendBurstStyle: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  skipCurrent: () => void;
  skipRemaining: () => void;
  handleSkipPress?: (isLongPress?: boolean) => void;
  accelerateReveal: (isLongPress?: boolean) => void;
  handleAcceleratePressIn?: () => void;
  handleAcceleratePressOut?: () => void;
  accelerateProgress?: number;
  isAccelerating?: boolean;
  accelerateSpeedLabel?: "1.5x" | "2.5x" | null;
  revealPlayState?: RevealPlayState;
  reduceMotionLevel?: ReduceMotionLevel;
  degradeLevel?: number;
  skipParticles?: boolean;
  atmosphereParticleScale?: number;
  skipTeaserAnim?: boolean;
  collectionEasterEgg?: {
    showEasterEgg: boolean;
    collected: number;
    totalInSeries?: number;
    seriesComplete?: boolean;
  };
  dismissSummary: () => void;
  onGoWarehouse?: () => void;
  onTryAgain: () => void;
  onVerifyFairness?: () => void;
  onShareHighlight?: () => void;
  reduceMotion?: boolean;
  queueLength?: number;
  staticFallback?: boolean;
  a11yFlashScale?: number;
  a11yLustreScale?: number;
};

export function OrderResultRevealPhase({
  pendingPayment,
  showReveal,
  showSummary,
  sequenceDone = false,
  motionDriver,
  revealMotionDriver,
  revealCycleKey,
  revealPlayToken = 0,
  revealIndex,
  revealProducts,
  orderId,
  tier,
  profile,
  pacing,
  showBoxTeaser = false,
  teaserVariant = "full",
  currentRevealProduct,
  currentPrizeImage,
  boxCoverUri,
  boxId,
  revealTheme,
  reanimatedReveal,
  rarityStats,
  legendCount,
  legendBurstStyle,
  skipCurrent,
  skipRemaining,
  handleSkipPress,
  accelerateReveal,
  handleAcceleratePressIn,
  handleAcceleratePressOut,
  accelerateProgress = 0,
  isAccelerating = false,
  accelerateSpeedLabel = null,
  revealPlayState = "idle",
  reduceMotionLevel = "medium",
  degradeLevel = 0,
  skipParticles,
  atmosphereParticleScale = 1,
  skipTeaserAnim,
  collectionEasterEgg,
  dismissSummary,
  onGoWarehouse,
  onTryAgain,
  onVerifyFairness,
  onShareHighlight,
  reduceMotion = false,
  queueLength = 0,
  staticFallback = false,
  a11yFlashScale = 1,
  a11yLustreScale = 1,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildRevealPhaseStyles);

  const handleOrderAgain = useCallback(() => {
    dismissSummary();
    setTimeout(() => onTryAgain(), 300);
  }, [dismissSummary, onTryAgain]);

  const subtitle =
    revealProducts.length > 1
      ? revealIndex === revealProducts.length - 1
        ? t("orderResult.revealProgressFinale", {
            current: revealIndex + 1,
            total: revealProducts.length,
          })
        : t("orderResult.revealProgress", {
            current: revealIndex + 1,
            total: revealProducts.length,
          })
      : t("orderResult.revealSuccessSubtitle");

  const overlayA11y = {
    reduceMotionLevel,
    degradeLevel,
    skipParticles,
    skipTeaserAnim,
    atmosphereParticleScale,
    accelerateProgress,
    isAccelerating,
    accelerateSpeedLabel,
    pacing,
    onAcceleratePressIn: handleAcceleratePressIn,
    onAcceleratePressOut: handleAcceleratePressOut,
    collectionEasterEgg: collectionEasterEgg?.showEasterEgg || collectionEasterEgg?.seriesComplete,
  };

  useRevealGestureLock(showReveal && !pendingPayment);
  const focusMode = getRevealFocusMode();
  const inMultiRevealSequence =
    revealProducts.length > 1 && !pendingPayment && !showSummary && !sequenceDone;
  const revealEffectsActive = showReveal && !pendingPayment && !showSummary;
  const showChrome = revealEffectsActive && !focusMode;
  const showRevealGapBackdrop = inMultiRevealSequence;
  const recordingFlags = resolveRecordingSafeRevealFlags();
  const [flashPeak, setFlashPeak] = useState(false);

  useAnimatedReaction(
    () => reanimatedReveal?.flashOpacity?.value ?? 0,
    (v) => {
      runOnJS(setFlashPeak)(v > 0.3);
    },
    [reanimatedReveal?.flashOpacity],
  );

  const easterEggHint =
    collectionEasterEgg?.seriesComplete
      ? t("orderResult.seriesCompleteBody")
      : collectionEasterEgg?.showEasterEgg
        ? t("revealOverlay.collectionEasterEgg")
        : undefined;

  const useExpoRevealOverlay =
    motionDriver === "expo-go" || staticFallback || Platform.OS === "android";

  return (
    <>
      {showRevealGapBackdrop ? <View style={styles.gapBackdrop} pointerEvents="none" /> : null}
      <DisabledOverlay visible={pendingPayment || (showReveal && revealPlayState === "paused")} />
      {useExpoRevealOverlay ? (
        <RevealOverlay
          key={`expo-reveal-${revealCycleKey}`}
          motionDriver="expo-go"
          fullScreen
          visible={showReveal && !pendingPayment}
          tier={tier}
          profile={profile}
          revealTheme={revealTheme}
          prizeName={currentRevealProduct?.name}
          prizeImageUri={currentPrizeImage}
          prizeQualityType={currentRevealProduct?.qualityType}
          boxCoverUri={boxCoverUri}
          boxId={boxId}
          showBoxTeaser={showBoxTeaser}
          teaserVariant={teaserVariant}
          reduceMotion={reduceMotion}
          playToken={revealPlayToken}
          onPressSkip={() => (handleSkipPress ?? skipCurrent)()}
          onLongPressAccelerate={() => accelerateReveal(true)}
          revealIndex={revealIndex}
          totalReveals={revealProducts.length}
          {...overlayA11y}
          a11yFlashScale={a11yFlashScale}
          a11yLustreScale={a11yLustreScale}
          subtitle={subtitle}
        />
      ) : revealMotionDriver === "reanimated" && reanimatedReveal ? (
        <RevealOverlay
          key={`reveal-${revealCycleKey}-${currentRevealProduct?.id ?? revealIndex}`}
          motionDriver="reanimated"
          fullScreen
          visible={showReveal && !pendingPayment}
          tier={tier}
          profile={profile}
          revealTheme={revealTheme}
          revealOpacity={reanimatedReveal.revealOpacity}
          revealScale={reanimatedReveal.revealScale}
          titlePunch={reanimatedReveal.titlePunch}
          rainProgress={reanimatedReveal.rainProgress}
          confettiProgress={reanimatedReveal.confettiProgress}
          flashOpacity={reanimatedReveal.flashOpacity}
          shakeX={reanimatedReveal.shakeX}
          prizeCardScale={reanimatedReveal.prizeCardScale}
          prizeCardOpacity={reanimatedReveal.prizeCardOpacity}
          cardFlip={reanimatedReveal.cardFlip}
          boxTeaserOpacity={reanimatedReveal.boxTeaserOpacity}
          prizeName={currentRevealProduct?.name}
          prizeImageUri={currentPrizeImage}
          prizeQualityType={currentRevealProduct?.qualityType}
          boxCoverUri={boxCoverUri}
          boxId={boxId}
          showBoxTeaser={showBoxTeaser}
          teaserVariant={teaserVariant}
          reduceMotion={reduceMotion}
          onPressSkip={() => (handleSkipPress ?? skipCurrent)()}
          onLongPressAccelerate={() => accelerateReveal(true)}
          revealIndex={revealIndex}
          totalReveals={revealProducts.length}
          {...overlayA11y}
          a11yFlashScale={a11yFlashScale}
          a11yLustreScale={a11yLustreScale}
          subtitle={subtitle}
        />
      ) : null}
      <RevealSequenceChrome
        visible={showChrome}
        revealIndex={revealIndex}
        revealProducts={revealProducts}
        orderId={orderId}
        flashPeak={flashPeak}
        queueLength={queueLength}
        onSkipCurrent={() => (handleSkipPress ?? skipCurrent)()}
        onSkipRemaining={revealProducts.length > 1 ? skipRemaining : undefined}
        onTurboToggle={(enabled) => {
          if (enabled) accelerateReveal(true);
        }}
      />
      {showReveal && !pendingPayment ? (
        <RevealPlayStateIndicator visible={showChrome} state={revealPlayState} />
      ) : null}
      <RevealFeedTicker visible={showChrome && !recordingFlags.hideTicker && !isRevealMinorModeActive()} boxId={boxId ?? null} />
      <RevealReactionTicker visible={showChrome} testID="revealReactionTicker" />
      <RevealLocalDanmaku visible={showChrome} useRoomReactions />
      <RevealCollectionHint
        visible={showChrome}
        collected={collectionEasterEgg?.collected ?? 0}
        totalInSeries={collectionEasterEgg?.totalInSeries}
      />
      <RevealHighlightsPanel boxId={boxId ?? null} />
      <RevealSummaryBurst
        visible={showSummary && !pendingPayment}
        total={rarityStats.total}
        legendary={rarityStats.legendary}
        hidden={rarityStats.hidden}
        prizes={revealProducts}
        revealTheme={revealTheme}
        boxId={boxId}
        reduceMotion={reduceMotion}
        onDone={dismissSummary}
        onGoWarehouse={onGoWarehouse}
        onOrderAgain={handleOrderAgain}
        onVerifyFairness={onVerifyFairness}
        onShareHighlight={onShareHighlight}
      />
      {legendCount > 0 && showReveal && !pendingPayment && !staticFallback ? (
        <LustreLegendFlashOverlay style={legendBurstStyle} tier={tier} />
      ) : null}
    </>
  );
}

function buildRevealPhaseStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    gapBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(6, 8, 18, 0.94)",
      zIndex: revealLayerZIndex.gapBackdrop,
    },
  });
}
