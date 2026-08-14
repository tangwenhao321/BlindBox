import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { parseError } from "../api";
import type { DrawPackOption } from "../components/DrawPackModal";
import type { MysteryBoxInsight } from "../services/boxInsightService";
import { calcPackPrice, DEFAULT_DRAW_PACK_CONFIGS, getBestPackTeaser } from "../services/drawPackService";
import type { PurchaseLimitStatus } from "../services/purchaseLimitService";
import type { PoolDashboard } from "../services/poolDashboardService";
import { toggleFavorite } from "../services/welfareService";
import { invalidateFavoriteQueries } from "../utils/invalidateAppQueries";
import { getDrawPackProgressHint } from "../utils/drawPackMath";
import { formatCurrency } from "../utils/formatCurrency";
import { sortProductsForCarousel } from "../utils/boxDetailsHelpers";
import { buildDrawPackOptions } from "../utils/drawPackOptions";
import { toast } from "../utils/toast";
import { trackEvent } from "../utils/analytics";
import { usePoolDashboardSse } from "./usePoolDashboardSse";
import { useAuthToken } from "./useAuthToken";
import {
  useBoxAuxiliaryQuery,
  useDrawPackConfigsQuery,
  usePurchaseLimitQuery,
} from "../query/hooks/useBoxDetailsQueries";
import { useFavoriteIdsQuery } from "../query/hooks/useFavoriteIdsQuery";
import { queryKeys } from "../query/keys";
import type { MysteryBox } from "../types";

type Params = {
  activeBox: MysteryBox;
  drawCount: number;
  isLoggedIn: boolean;
  hasAddress: boolean;
  resumeConfirmCheckout?: boolean;
  onResumeConfirmHandled?: () => void;
  onOpenConfirmCheckout: () => void;
  quotePayAmount?: number | null;
  quoteProductAmount?: number | null;
  quotingPrice?: boolean;
  quoteError?: string | null;
  onRequireLogin?: () => void;
};

export function useBoxDetailsData(params: Params) {
  const {
    activeBox,
    drawCount,
    isLoggedIn,
    hasAddress: _hasAddress,
    resumeConfirmCheckout,
    onResumeConfirmHandled,
    onOpenConfirmCheckout,
    quotePayAmount,
    quoteProductAmount,
    quotingPrice,
    quoteError,
    onRequireLogin,
  } = params;
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const products = useMemo(() => activeBox.products || [], [activeBox.products]);
  const carouselItems = useMemo(
    () => sortProductsForCarousel(products, activeBox),
    [products, activeBox],
  );

  const drawPackQuery = useDrawPackConfigsQuery(authToken);
  const auxiliaryQuery = useBoxAuxiliaryQuery(authToken, activeBox.id);
  const purchaseLimitQuery = usePurchaseLimitQuery(authToken, activeBox.id, isLoggedIn);
  const favoriteIdsQuery = useFavoriteIdsQuery(authToken, isLoggedIn);

  const drawConfigs = useMemo(() => drawPackQuery.data ?? [], [drawPackQuery.data]);
  const auxiliary = auxiliaryQuery.data;
  const [insightOverride, setInsightOverride] = useState<MysteryBoxInsight | null>(null);
  const [poolDashboardOverride, setPoolDashboardOverride] = useState<PoolDashboard | null>(null);

  const insight = insightOverride ?? auxiliary?.insight ?? null;
  const poolDashboard = poolDashboardOverride ?? auxiliary?.poolDashboard ?? null;
  const trustMeta = auxiliary?.trustMeta ?? null;
  const seriesDrawStats = auxiliary?.seriesDrawStats ?? null;
  const pityProgress = auxiliary?.pityProgress ?? null;
  const pityError = auxiliary?.pityError ?? null;
  const purchaseLimit: PurchaseLimitStatus | null = purchaseLimitQuery.data ?? null;
  const isFavorite = favoriteIdsQuery.data?.includes(activeBox.id) ?? false;

  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const auxiliaryLoading = auxiliaryQuery.isLoading;
  const auxiliaryError = auxiliaryQuery.error ? parseError(auxiliaryQuery.error) : null;

  const poolTotal =
    poolDashboard?.poolTotal ?? insight?.poolTotal ?? activeBox.poolTotal ?? Math.max(products.length * 10, 100);
  const poolRemaining =
    poolDashboard?.poolRemaining ?? insight?.poolRemaining ?? activeBox.poolRemaining ?? poolTotal;
  const poolProgress = poolTotal > 0 ? Math.min(1, poolRemaining / poolTotal) : 0;
  const prizeLines = useMemo(() => insight?.prizeLines ?? [], [insight?.prizeLines]);
  const filteredPrizeLines = useMemo(() => {
    if (!selectedTier) return prizeLines;
    const tier = selectedTier.toUpperCase();
    return prizeLines.filter((line) => (line.qualityType || "GENERAL").toUpperCase() === tier);
  }, [prizeLines, selectedTier]);
  const packEstimate = useMemo(
    () => calcPackPrice(activeBox.price, drawCount, drawConfigs),
    [activeBox.price, drawCount, drawConfigs],
  );
  const drawOptions: DrawPackOption[] = useMemo(() => {
    const configs = drawConfigs.length ? drawConfigs : DEFAULT_DRAW_PACK_CONFIGS;
    return buildDrawPackOptions(activeBox.price, configs.filter((c) => c.enabled));
  }, [activeBox.price, drawConfigs]);
  const quotedProduct = quoteProductAmount ?? packEstimate.price;
  const batchDiscount = Math.max(0, activeBox.price * drawCount - quotedProduct);
  const packTeaser = useMemo(() => getBestPackTeaser(activeBox.price, drawConfigs), [activeBox.price, drawConfigs]);
  const packProgressHint = useMemo(
    () => getDrawPackProgressHint(drawCount, activeBox.price, drawConfigs),
    [drawCount, activeBox.price, drawConfigs],
  );
  const displayPayAmount = typeof quotePayAmount === "number" ? quotePayAmount : packEstimate.price;
  const priceHint = quotingPrice
    ? t("boxDetailsData.quoting")
    : quoteError
      ? t("boxDetailsData.quoteFailed", { error: quoteError })
      : typeof quotePayAmount === "number"
        ? t("boxDetailsData.payAmount", { amount: formatCurrency(quotePayAmount) })
        : t("boxDetailsData.referencePrice", {
            amount: formatCurrency(packEstimate.price),
            drawCount,
          });

  useEffect(() => {
    setInsightOverride(null);
    setPoolDashboardOverride(null);
  }, [activeBox.id]);

  useEffect(() => {
    if (purchaseLimitQuery.error) {
      toast.error(t("boxDetailsData.purchaseLimitFailed", { message: parseError(purchaseLimitQuery.error) }));
    }
  }, [purchaseLimitQuery.error, t]);

  useEffect(() => {
    if (favoriteIdsQuery.error) {
      toast.error(t("boxDetailsData.favoriteLoadFailed", { message: parseError(favoriteIdsQuery.error) }));
    }
  }, [favoriteIdsQuery.error, t]);

  const reloadAuxiliary = useCallback(async () => {
    await auxiliaryQuery.refetch();
  }, [auxiliaryQuery]);

  usePoolDashboardSse(authToken, activeBox.id, true, (dash) => {
    setPoolDashboardOverride(dash);
    setInsightOverride((prev) =>
      prev
        ? { ...prev, poolRemaining: dash.poolRemaining, poolTotal: dash.poolTotal }
        : auxiliary?.insight
          ? { ...auxiliary.insight, poolRemaining: dash.poolRemaining, poolTotal: dash.poolTotal }
          : null,
    );
  });

  useEffect(() => {
    if (resumeConfirmCheckout) {
      onOpenConfirmCheckout();
      onResumeConfirmHandled?.();
    }
  }, [resumeConfirmCheckout, onResumeConfirmHandled, onOpenConfirmCheckout]);

  const onToggleFavorite = async () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    try {
      const next = await toggleFavorite(authToken, activeBox.id);
      queryClient.setQueryData(queryKeys.favorites.ids(authToken), (old: string[] | undefined) => {
        const ids = old ?? [];
        return next ? [...ids.filter((id) => id !== activeBox.id), activeBox.id] : ids.filter((id) => id !== activeBox.id);
      });
      invalidateFavoriteQueries(authToken);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      trackEvent("favorite_toggle", { boxId: activeBox.id, favorited: next });
      toast.success(next ? t("boxDetailsData.favoriteAdded") : t("boxDetailsData.favoriteRemoved"));
    } catch (error) {
      toast.error(String(error));
    }
  };

  const wholeBoxDrawCount = useMemo(() => {
    if (drawConfigs.length === 0) return null;
    const maxConfig = drawConfigs.reduce((max, cfg) => (cfg.drawCount > max ? cfg.drawCount : max), 0);
    if (poolRemaining > 0 && poolRemaining < maxConfig) return poolRemaining;
    return maxConfig;
  }, [drawConfigs, poolRemaining]);

  return {
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
    poolTotal,
    poolRemaining,
    poolProgress,
    filteredPrizeLines,
    packEstimate,
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
  };
}
