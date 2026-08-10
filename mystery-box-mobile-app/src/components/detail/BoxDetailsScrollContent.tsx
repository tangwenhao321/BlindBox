import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { InlineSectionError } from "../ui/InlineSectionError";
import { ListErrorBanner } from "../ui/ListErrorBanner";
import { ListSkeleton } from "../ListSkeleton";
import type { QueueStatus } from "../../services/drawQueueService";
import type { MysteryBox } from "../../types";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../../styles/tokens";
import { BoxDetailsBenefitCards } from "./BoxDetailsBenefitCards";
import { BoxDetailsComplianceCard } from "./BoxDetailsComplianceCard";
import { BoxDetailsModeSection } from "./BoxDetailsModeSection";
import { BoxPrizeStockSection } from "./BoxPrizeStockSection";
import { BoxOpenPreview } from "./BoxOpenPreview";
import { DrawPackQuickSelector } from "./DrawPackQuickSelector";
import type { DrawPackOption } from "../DrawPackModal";
import { BoxProductCarousel } from "./BoxProductCarousel";
import { BoxProductGrid } from "./BoxProductGrid";
import { PoolTierDashboard } from "./PoolTierDashboard";
import { QualityFilterChips } from "../ui/QualityFilterChips";
import type { PrizeQualityFilter } from "../../utils/qualityFilters";
import { normalizeQualityTier } from "../../utils/quality";
import { TrustComplianceStrip } from "./TrustComplianceStrip";
import type { MysteryBoxInsight, PrizeStockLine } from "../../services/boxInsightService";
import type { PityProgress } from "../../services/pityService";
import type { PoolDashboard } from "../../services/poolDashboardService";
import type { TrustMeta } from "../../services/trustMetaService";
import type { SeriesDrawStatistics } from "../../services/fairnessService";
import { SeriesDrawStatisticsSection } from "../SeriesDrawStatisticsSection";

import type { DrawMode } from "../../services/orderService";

type Props = {
  activeBox: MysteryBox;
  isLoggedIn: boolean;
  carouselItems: NonNullable<MysteryBox["products"]>;
  onCarouselIndexChange: (index: number) => void;
  poolDashboard: PoolDashboard | null;
  selectedTier?: string | null;
  onSelectTier?: (tier: string | null) => void;
  trustMeta: TrustMeta | null;
  onOpenProbability?: () => void;
  pityProgress: PityProgress | null;
  pityError?: string | null;
  insight: MysteryBoxInsight | null;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  queueBlocked: boolean;
  buyoutBlocked: boolean;
  buyoutLockHeld: boolean;
  buyoutLockTtl: number;
  queueStatus: QueueStatus | null;
  poolRemaining: number;
  authToken?: string;
  selectedSlotNo?: number | null;
  onSelectSlot?: (slotNo: number | null) => void;
  cabinetBlocked?: boolean;
  filteredPrizeLines: PrizeStockLine[];
  onOpenProbHelp: () => void;
  onTryOpenCheckout?: () => void;
  onHoldPreviewStart?: () => void;
  onHoldPreviewEnd?: () => void;
  drawOptions?: DrawPackOption[];
  drawCount?: number;
  onChangeDrawCount?: (count: number) => void;
  auxiliaryLoading?: boolean;
  auxiliaryError?: string | null;
  onRetryAuxiliary?: () => void;
  seriesDrawStats?: SeriesDrawStatistics | null;
};

export function BoxDetailsScrollContent({
  activeBox,
  isLoggedIn,
  carouselItems,
  onCarouselIndexChange,
  poolDashboard,
  selectedTier,
  onSelectTier,
  trustMeta,
  onOpenProbability,
  pityProgress,
  pityError = null,
  insight,
  drawMode,
  onDrawModeChange,
  queueBlocked,
  buyoutBlocked,
  buyoutLockHeld,
  buyoutLockTtl,
  queueStatus,
  poolRemaining,
  authToken,
  selectedSlotNo,
  onSelectSlot,
  cabinetBlocked,
  filteredPrizeLines,
  onOpenProbHelp,
  onTryOpenCheckout,
  onHoldPreviewStart,
  onHoldPreviewEnd,
  drawOptions = [],
  drawCount = 1,
  onChangeDrawCount,
  auxiliaryLoading = false,
  auxiliaryError = null,
  onRetryAuxiliary,
  seriesDrawStats = null,
}: Props) {
  const { t } = useTranslation();
  const products = activeBox.products || [];
  const styles = useThemedStyles((colors) => ({
    scroll: {
      paddingHorizontal: layout.screenPaddingX,
      paddingBottom: layout.screenPaddingBottom + 88,
      gap: spacing.md,
    },
    guestHint: {
      marginBottom: spacing.md,
      padding: spacing.sm,
      backgroundColor: colors.bgSoft,
      borderRadius: radius.md,
      color: colors.textSecondary,
      fontSize: typography.caption,
      textAlign: "center",
    },
    auxSkeleton: { marginBottom: spacing.md },
  }));

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <BoxProductCarousel activeBox={activeBox} items={carouselItems} onIndexChange={onCarouselIndexChange} />
      <BoxOpenPreview
        box={activeBox}
        onPress={onTryOpenCheckout}
        onHoldPreviewStart={onHoldPreviewStart}
        onHoldPreviewEnd={onHoldPreviewEnd}
      />
      {drawOptions.length > 1 && onChangeDrawCount ? (
        <DrawPackQuickSelector
          options={drawOptions}
          selectedCount={drawCount}
          onSelectCount={onChangeDrawCount}
        />
      ) : null}

      <PoolTierDashboard dashboard={poolDashboard} selectedTier={selectedTier} onSelectTier={onSelectTier} />
      {onSelectTier ? (
        <QualityFilterChips
          value={(selectedTier ? normalizeQualityTier(selectedTier) : "ALL") as PrizeQualityFilter}
          onChange={(tier) => onSelectTier(tier === "ALL" ? null : tier)}
        />
      ) : null}
      <TrustComplianceStrip meta={trustMeta} onOpenProbability={onOpenProbability} />
      {!isLoggedIn ? <Text style={styles.guestHint}>{t("boxDetails.guestHint")}</Text> : null}
      {auxiliaryError ? (
        <InlineSectionError message={auxiliaryError} onRetry={onRetryAuxiliary} />
      ) : auxiliaryLoading && !poolDashboard && !insight ? (
        <View style={styles.auxSkeleton}>
          <ListSkeleton variant="row" rows={2} />
        </View>
      ) : null}

      {pityError ? <ListErrorBanner message={pityError} onRetry={onRetryAuxiliary} /> : null}

      <BoxDetailsBenefitCards pityProgress={pityProgress} insight={insight} />

      <BoxDetailsModeSection
        drawMode={drawMode}
        onDrawModeChange={onDrawModeChange}
        queueBlocked={queueBlocked}
        buyoutBlocked={buyoutBlocked}
        buyoutLockHeld={buyoutLockHeld}
        buyoutLockTtl={buyoutLockTtl}
        queueStatus={queueStatus}
        poolRemaining={poolRemaining}
        authToken={authToken}
        boxId={activeBox.id}
        selectedSlotNo={selectedSlotNo}
        onSelectSlot={onSelectSlot}
        cabinetBlocked={cabinetBlocked}
      />

      <BoxPrizeStockSection
        prizeLines={filteredPrizeLines}
        onOpenProbability={onOpenProbability}
        onOpenProbHelp={onOpenProbHelp}
      />

      {seriesDrawStats ? <SeriesDrawStatisticsSection stats={seriesDrawStats} compact /> : null}

      <BoxProductGrid products={products} />

      <BoxDetailsComplianceCard />
    </ScrollView>
  );
}
