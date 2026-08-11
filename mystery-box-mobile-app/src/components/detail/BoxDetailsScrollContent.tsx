import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { InlineSectionError } from "../ui/InlineSectionError";
import { ListErrorBanner } from "../ui/ListErrorBanner";
import { ListSkeleton } from "../ListSkeleton";
import type { QueueStatus } from "../../services/drawQueueService";
import type { MysteryBox } from "../../types";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, layout, spacing, typography } from "../../styles/tokens";
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
  const insets = useSafeAreaInsets();
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const products = activeBox.products || [];
  /** Sticky bottom bar ≈ 88px content + safe-area inset added in BoxDetailsBottomBar. */
  const styles = useThemedStyles((colors) => ({
    scroll: {
      paddingHorizontal: layout.screenPaddingX,
      paddingBottom: layout.screenPaddingBottom + 88 + insets.bottom,
      gap: spacing.md,
    },
    guestHint: {
      ...font("body"),
      marginBottom: spacing.sm,
      paddingVertical: spacing.sm,
      color: colors.textSecondary,
      fontSize: typography.caption,
      textAlign: "center" as const,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    auxSkeleton: { marginBottom: spacing.md },
    sectionToggle: {
      alignItems: "center" as const,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sectionToggleText: {
      ...font("bodyMedium"),
      color: colors.textMuted,
      fontSize: typography.caption,
    },
    mutedBlock: { gap: spacing.md },
  }), [insets.bottom]);

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

      {!isLoggedIn ? <Text style={styles.guestHint}>{t("boxDetails.guestHint")}</Text> : null}

      <TrustComplianceStrip meta={trustMeta} onOpenProbability={onOpenProbability} />

      {auxiliaryError ? (
        <InlineSectionError message={auxiliaryError} onRetry={onRetryAuxiliary} />
      ) : auxiliaryLoading && !poolDashboard && !insight ? (
        <View style={styles.auxSkeleton}>
          <ListSkeleton variant="row" rows={2} />
        </View>
      ) : null}

      {pityError ? <ListErrorBanner message={pityError} onRetry={onRetryAuxiliary} /> : null}

      <BoxDetailsBenefitCards
        pityProgress={pityProgress}
        insight={insight}
        token={authToken}
        boxId={activeBox.id}
        onPityRefetch={onRetryAuxiliary}
      />

      <BoxPrizeStockSection
        prizeLines={filteredPrizeLines}
        onOpenProbability={onOpenProbability}
        onOpenProbHelp={onOpenProbHelp}
      />

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

      <Pressable
        style={styles.sectionToggle}
        onPress={() => setCabinetOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: cabinetOpen }}
        accessibilityLabel={
          cabinetOpen ? t("boxDetails.cabinetDetailsCollapseA11y") : t("boxDetails.cabinetDetailsExpandA11y")
        }
      >
        <Text style={styles.sectionToggleText}>
          {cabinetOpen ? t("boxDetails.cabinetDetailsCollapse") : t("boxDetails.cabinetDetailsExpand")}
        </Text>
      </Pressable>

      {cabinetOpen ? (
        <View style={styles.mutedBlock}>
          <PoolTierDashboard dashboard={poolDashboard} selectedTier={selectedTier} onSelectTier={onSelectTier} />
          {onSelectTier ? (
            <QualityFilterChips
              value={(selectedTier ? normalizeQualityTier(selectedTier) : "ALL") as PrizeQualityFilter}
              onChange={(tier) => onSelectTier(tier === "ALL" ? null : tier)}
            />
          ) : null}

          {seriesDrawStats ? <SeriesDrawStatisticsSection stats={seriesDrawStats} compact /> : null}

          <BoxProductGrid products={products} />

          <BoxDetailsComplianceCard />
        </View>
      ) : null}
    </ScrollView>
  );
}
