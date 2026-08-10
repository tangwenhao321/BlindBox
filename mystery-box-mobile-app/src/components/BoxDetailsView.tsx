import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useLoopPulse } from "../effects/reanimated/useLoopPulse";
import { SafeAreaView } from "react-native-safe-area-context";
import { WinRecordModal } from "./WinRecordModal";
import { SubPageHeader } from "./ui/SubPageHeader";
import { spacing } from "../styles/tokens";
import type { MysteryBox } from "../types";
import type { DrawMode } from "../services/orderService";
import { measureAnchor, useOnboardingAnchors } from "../context/OnboardingAnchorContext";
import {
  BoxDetailsBottomBar,
  BoxDetailsCheckoutModals,
  BoxDetailsHeaderActions,
  BoxDetailsProbHelpModal,
  BoxDetailsScrollContent,
  BoxDetailsWinFab,
} from "./detail";
import { BoxHintBottomSheet } from "./detail/BoxHintBottomSheet";
import { BoxOpenPreviewOverlay } from "./detail/BoxOpenPreviewOverlay";
import { OnboardingFlow } from "./OnboardingFlow";
import { shouldShowOnboarding } from "./OnboardingOverlay";
import { markOnboardingCoachDone, shouldShowOnboardingCoach } from "../utils/onboardingCoachStorage";
import { hasUserPurchasedLocally } from "../utils/newcomerOffer";
import { useAuthToken } from "../hooks/useAuthToken";
import { useBoxDrawModeEffects } from "../hooks/useBoxDrawModeEffects";
import { useBoxDetailsData } from "../hooks/useBoxDetailsData";
import { trackEvent } from "../utils/analytics";
import { toast } from "../utils/toast";
import { prefetchRevealImages } from "../utils/imagePrefetch";
import { warmupTierSounds } from "../effects/sound";
import { shouldAllowRevealPrefetch } from "../effects/revealAssetManager";
import { prefetchOfflineRevealBundle } from "../effects/revealOfflineMode";
import { getRevealRemoteConfig } from "../effects/revealRemote";
import NetInfo from "@react-native-community/netinfo";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import { resolveProductImageUrl } from "../utils/boxImage";

type Props = {
  activeBox: MysteryBox;
  addresses: import("../types").Address[];
  selectedAddressId: string;
  creatingOrder: boolean;
  onBack: () => void;
  onOpenAddressModal: () => void;
  onOpenAddressFormPage?: (address?: import("../types").Address, resumeCheckout?: boolean) => void;
  onContactSupport?: () => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  resumeConfirmCheckout?: boolean;
  onResumeConfirmHandled?: () => void;
  spendLimitRefreshKey?: number;
  drawCount: number;
  onChangeDrawCount: (count: number) => void;
  onCreateOrder: (drawMode: DrawMode, slotNo?: number) => void;
  onOpenProbability?: () => void;
  onOpenLeaderboard?: () => void;
  quotePayAmount?: number | null;
  quoteProductAmount?: number | null;
  quoteDeliveryFee?: number;
  quoteCouponAmount?: number;
  quoteRetentionDiscount?: number;
  quoteSavingsAmount?: number;
  suggestedCouponApplied?: boolean;
  quotingPrice?: boolean;
  quoteError?: string | null;
  offline?: boolean;
  skipOnboardingCoach?: boolean;
};

export function BoxDetailsView(props: Props) {
  const {
    activeBox,
    addresses,
    selectedAddressId,
    creatingOrder,
    onBack,
    onOpenAddressModal,
    onOpenAddressFormPage,
    onContactSupport,
    isLoggedIn = true,
    onRequireLogin,
    resumeConfirmCheckout,
    onResumeConfirmHandled,
    spendLimitRefreshKey = 0,
    drawCount,
    onChangeDrawCount,
    onCreateOrder,
    onOpenProbability,
    onOpenLeaderboard,
    quotePayAmount,
    quoteProductAmount,
    quoteDeliveryFee = 0,
    quoteCouponAmount = 0,
    quoteRetentionDiscount = 0,
    quoteSavingsAmount = 0,
    suggestedCouponApplied = false,
    quotingPrice,
    quoteError,
    offline = false,
    skipOnboardingCoach = false,
  } = props;

  const authToken = useAuthToken();
  useAppPublicConfig({ boxId: activeBox.id, categoryId: activeBox.category?.id, themeId: undefined });
  const { t } = useTranslation();
  const styles = useThemedStyles((colors) => ({
    page: { flex: 1, backgroundColor: colors.bgPage },
    headerActionsRow: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.bgCard,
    },
  }));

  const products = activeBox.products || [];
  const hasAddress = addresses.length > 0 && !!selectedAddressId;
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [drawModalVisible, setDrawModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [winModalVisible, setWinModalVisible] = useState(false);
  const [probHelpVisible, setProbHelpVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [previewOverlayVisible, setPreviewOverlayVisible] = useState(false);
  const [coachVisible, setCoachVisible] = useState(false);
  const openBtnRef = useRef<View>(null);
  const { setAnchor } = useOnboardingAnchors();
  const ctaPulse = useLoopPulse(true, 900);

  const {
    carouselItems,
    drawConfigs,
    insight,
    pityProgress,
    pityError,
    poolDashboard,
    trustMeta,
    selectedTier,
    setSelectedTier,
    isFavorite,
    purchaseLimit,
    poolRemaining,
    filteredPrizeLines,
    drawOptions,
    quotedProduct,
    batchDiscount,
    packTeaser,
    packProgressHint,
    displayPayAmount,
    priceHint,
    onToggleFavorite,
    auxiliaryLoading,
    auxiliaryError,
    reloadAuxiliary,
    seriesDrawStats,
    wholeBoxDrawCount,
    poolTotal,
  } = useBoxDetailsData({
    activeBox,
    drawCount,
    isLoggedIn,
    hasAddress,
    resumeConfirmCheckout,
    onResumeConfirmHandled,
    onOpenConfirmCheckout: () => setConfirmVisible(true),
    quotePayAmount,
    quoteProductAmount,
    quotingPrice,
    quoteError,
    onRequireLogin,
  });

  const {
    drawMode,
    setDrawMode,
    queueStatus,
    buyoutLockTtl,
    buyoutLockHeld,
    buyoutBlocked,
    queueBlocked,
    cabinetBlocked,
    selectedSlotNo,
    setSelectedSlotNo,
  } = useBoxDrawModeEffects({
    authToken,
    boxId: activeBox.id,
    boxName: activeBox.name,
    isLoggedIn,
    poolRemaining,
    drawConfigs,
    drawCount,
    onChangeDrawCount,
  });

  const canSubmit =
    hasAddress &&
    !creatingOrder &&
    !quotingPrice &&
    !quoteError &&
    !buyoutBlocked &&
    !queueBlocked &&
    !cabinetBlocked &&
    !offline;
  const prevQueueCanDraw = useRef(false);
  const queueLeaveHint = useRef({ drawMode, queueStatus });
  queueLeaveHint.current = { drawMode, queueStatus };

  useEffect(() => {
    if (drawMode !== "queue" || !queueStatus?.canDraw) {
      prevQueueCanDraw.current = queueStatus?.canDraw ?? false;
      return;
    }
    if (!prevQueueCanDraw.current && !confirmVisible) {
      setConfirmVisible(true);
    }
    prevQueueCanDraw.current = queueStatus.canDraw;
  }, [drawMode, queueStatus?.canDraw, confirmVisible]);

  useEffect(() => {
    const uris = filteredPrizeLines
      .slice(0, 12)
      .map((line) => resolveProductImageUrl(line.productId, line.productName));
    void NetInfo.fetch().then((state) => {
      if (!shouldAllowRevealPrefetch(state.type)) return;
      void prefetchRevealImages(uris);
      void warmupTierSounds();
      const themeId = getRevealRemoteConfig().themeId;
      if (themeId) void prefetchOfflineRevealBundle(themeId);
    });
  }, [activeBox.id, activeBox.name, filteredPrizeLines]);

  useEffect(() => {
    return () => {
      const { drawMode: mode, queueStatus: status } = queueLeaveHint.current;
      if (mode === "queue" && status?.position && status.position > 0 && !status.canDraw) {
        toast.info(t("boxDetails.queueLeaveHint"));
      }
    };
  }, []);

  useEffect(() => {
    trackEvent("box_detail_view", { boxId: activeBox.id, boxName: activeBox.name });
  }, [activeBox.id, activeBox.name]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isLoggedIn) {
        if (!cancelled) setCoachVisible(false);
        return;
      }
      if (await hasUserPurchasedLocally()) {
        if (!cancelled) setCoachVisible(false);
        return;
      }
      if (skipOnboardingCoach) {
        await markOnboardingCoachDone();
        if (!cancelled) setCoachVisible(false);
        return;
      }
      if (await hasUserPurchasedLocally()) {
        await markOnboardingCoachDone();
        if (!cancelled) setCoachVisible(false);
        return;
      }
      const introPending = await shouldShowOnboarding();
      if (introPending) return;
      const showCoach = await shouldShowOnboardingCoach(false);
      if (!cancelled && showCoach) setCoachVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBox.id, isLoggedIn, skipOnboardingCoach]);

  useEffect(() => {
    if (!confirmVisible || !coachVisible) return;
    setCoachVisible(false);
    void markOnboardingCoachDone();
  }, [confirmVisible, coachVisible]);

  useEffect(() => {
    const t = setTimeout(() => measureAnchor(openBtnRef, "openBox", setAnchor), 400);
    return () => clearTimeout(t);
  }, [activeBox.id, setAnchor]);

  const featured = carouselItems[carouselIndex] || carouselItems[0];

  return (
    <SafeAreaView style={styles.page} edges={["left", "right"]}>
      <SubPageHeader title={activeBox.name} onBack={onBack} />
      <View style={styles.headerActionsRow}>
        <BoxDetailsHeaderActions
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onContactSupport={onContactSupport}
          onOpenLeaderboard={onOpenLeaderboard}
          onOpenHint={isLoggedIn ? () => setHintVisible(true) : undefined}
        />
      </View>

      <BoxDetailsScrollContent
        activeBox={activeBox}
        isLoggedIn={isLoggedIn}
        carouselItems={carouselItems}
        onCarouselIndexChange={setCarouselIndex}
        poolDashboard={poolDashboard}
        selectedTier={selectedTier}
        onSelectTier={setSelectedTier}
        trustMeta={trustMeta}
        onOpenProbability={onOpenProbability}
        pityProgress={pityProgress}
        pityError={pityError}
        insight={insight}
        drawMode={drawMode}
        onDrawModeChange={setDrawMode}
        queueBlocked={queueBlocked}
        buyoutBlocked={buyoutBlocked}
        buyoutLockHeld={buyoutLockHeld}
        buyoutLockTtl={buyoutLockTtl}
        queueStatus={queueStatus}
        poolRemaining={poolRemaining}
        authToken={authToken}
        selectedSlotNo={selectedSlotNo}
        onSelectSlot={setSelectedSlotNo}
        cabinetBlocked={cabinetBlocked}
        filteredPrizeLines={filteredPrizeLines}
        onOpenProbHelp={() => setProbHelpVisible(true)}
        onTryOpenCheckout={() => {
          if (offline) {
            toast.info(t("offline.noNetworkOrder"));
            return;
          }
          if (!isLoggedIn) {
            onRequireLogin?.();
            return;
          }
          setDrawModalVisible(true);
        }}
        onHoldPreviewStart={() => setPreviewOverlayVisible(true)}
        onHoldPreviewEnd={() => setPreviewOverlayVisible(false)}
        drawOptions={drawOptions}
        drawCount={drawCount}
        onChangeDrawCount={onChangeDrawCount}
        auxiliaryLoading={auxiliaryLoading}
        auxiliaryError={auxiliaryError}
        onRetryAuxiliary={() => void reloadAuxiliary()}
        seriesDrawStats={seriesDrawStats}
      />

      <BoxOpenPreviewOverlay
        visible={previewOverlayVisible}
        box={activeBox}
        onDismiss={() => setPreviewOverlayVisible(false)}
      />

      <BoxDetailsWinFab onPress={() => setWinModalVisible(true)} />

      <BoxDetailsBottomBar
        displayPayAmount={displayPayAmount}
        drawCount={drawCount}
        products={products}
        boxName={activeBox.name}
        boxId={activeBox.id}
        boxCategoryName={activeBox.category?.name}
        batchDiscount={batchDiscount}
        packProgressHint={packProgressHint}
        packTeaser={packTeaser}
        purchaseLimit={purchaseLimit}
        buyoutBlocked={buyoutBlocked}
        ctaPulse={ctaPulse}
        openBtnRef={openBtnRef}
        isLoggedIn={isLoggedIn}
        onRequireLogin={onRequireLogin}
        onOpenDrawModal={() => setDrawModalVisible(true)}
      />

      <BoxDetailsCheckoutModals
        activeBox={activeBox}
        authToken={authToken}
        drawCount={drawCount}
        drawMode={drawMode}
        selectedSlotNo={selectedSlotNo}
        drawOptions={drawOptions}
        displayPayAmount={displayPayAmount}
        quotedProduct={quotedProduct}
        batchDiscount={batchDiscount}
        quoteDeliveryFee={quoteDeliveryFee}
        quoteCouponAmount={quoteCouponAmount}
        quoteRetentionDiscount={quoteRetentionDiscount}
        quoteSavingsAmount={quoteSavingsAmount}
        suggestedCouponApplied={suggestedCouponApplied}
        quotingPrice={quotingPrice}
        quoteError={quoteError}
        creatingOrder={creatingOrder}
        canSubmit={canSubmit}
        priceHint={priceHint}
        hasAddress={hasAddress}
        addresses={addresses}
        selectedAddressId={selectedAddressId}
        isLoggedIn={isLoggedIn}
        queueBlocked={queueBlocked}
        buyoutBlocked={buyoutBlocked}
        queueStatus={queueStatus}
        offline={offline}
        poolTotal={poolTotal}
        poolRemaining={poolRemaining}
        wholeBoxDrawCount={wholeBoxDrawCount ?? undefined}
        onChangeDrawCount={onChangeDrawCount}
        onCreateOrder={onCreateOrder}
        onRequireLogin={onRequireLogin}
        onOpenAddressModal={onOpenAddressModal}
        onOpenAddressFormPage={onOpenAddressFormPage}
        drawModalVisible={drawModalVisible}
        onDrawModalVisibleChange={setDrawModalVisible}
        confirmVisible={confirmVisible}
        onConfirmVisibleChange={setConfirmVisible}
        spendLimitRefreshKey={spendLimitRefreshKey}
      />

      <WinRecordModal
        visible={winModalVisible}
        boxId={activeBox.id}
        token={authToken}
        products={products}
        onClose={() => setWinModalVisible(false)}
      />

      <BoxDetailsProbHelpModal visible={probHelpVisible} onClose={() => setProbHelpVisible(false)} />
      <BoxHintBottomSheet
        visible={hintVisible}
        token={authToken}
        boxId={activeBox.id}
        onClose={() => setHintVisible(false)}
      />
      <OnboardingFlow
        visible={coachVisible && !confirmVisible}
        mode="coach"
        onDone={() => {
          setConfirmVisible(false);
          setCoachVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
