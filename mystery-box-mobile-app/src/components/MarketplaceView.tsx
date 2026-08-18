import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  AppState,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AppStateStatus,
  type TextStyle,
} from "react-native";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { RemoteImage } from "./ui/RemoteImage";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { AppGradient } from "./ui/AppGradient";
import {
  buyMarketplaceListing,
  cancelMarketplaceListing,
  cancelMarketplaceTrade,
  coolingRemainingMs,
  fetchMarketplaceCertificate,
  fetchMarketplaceCredit,
  formatCoolingCountdown,
  submitMarketplaceCertificate,
  type MarketplaceListing,
  type PurchasedListing,
} from "../services/marketplaceService";
import { resolveProductImageUrl } from "../utils/boxImage";
import { qualityLabelFromRaw } from "../utils/quality";
import { parseError, toAppError } from "../api";
import { queueIfOffline } from "../utils/offlineSubmitGuard";
import { reportAppError } from "../utils/crashReport";
import { trackEvent } from "../utils/analytics";
import { formatCurrency } from "../utils/formatCurrency";
import { estimateMarketplaceNetProceeds } from "../utils/marketplaceProceeds";
import { toast } from "../utils/toast";
import { isIosDigitalGoodsRestricted } from "../utils/iosDigitalGoodsGate";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { useAuthToken } from "../hooks/useAuthToken";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import {
  useMarketplaceListingsQuery,
  useMyMarketplaceListingsQuery,
  usePurchasedMarketplaceListingsQuery,
  type MarketSort,
} from "../query/hooks/useMarketplaceListingsQuery";
import { queryKeys } from "../query/keys";
import { fetchMarketplaceListingsPage } from "../query/fetchers";
import { layout, radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { InlineGuideBanner } from "./ui/InlineGuideBanner";
import { appViewToHref } from "../navigation/appViewRoutes";
import { setMarketplaceChatParams } from "../navigation/marketplaceChatParams";
import { dismissMarketplaceGuide, shouldShowMarketplaceGuide } from "../utils/uxGuideStorage";

type Tab = "market" | "mine" | "purchased";

type Props = {
  onBack: () => void;
  onRequireLogin?: () => void;
  onGoWarehouse?: () => void;
};

function listingStatusLabel(status: string, t: (key: string) => string) {
  if (status === "ON_SALE") return t("marketplace.statusOnSale");
  if (status === "SOLD") return t("marketplace.statusSold");
  if (status === "CANCELLED") return t("marketplace.statusCancelled");
  if (status === "COOLING") return t("marketplace.statusCooling");
  if (status === "PENDING_EXTERNAL") return t("marketplace.statusPendingExternal");
  return status;
}

function isPendingExternal(row: { status?: string | null; tradeStatus?: string | null }) {
  return row.status === "PENDING_EXTERNAL" || row.tradeStatus === "PENDING_EXTERNAL";
}

function displayListingStatus(
  row: { status?: string | null; tradeStatus?: string | null },
  t: (key: string) => string,
) {
  if (isPendingExternal(row)) return listingStatusLabel("PENDING_EXTERNAL", t);
  return listingStatusLabel(row.status ?? "", t);
}

/** Isolates 1s tick to cooling rows so the whole list does not re-render every second. */
function MarketplaceCoolingLabel({
  coolingUntil,
  style,
}: {
  coolingUntil?: string | null;
  style?: TextStyle;
}) {
  const { t } = useTranslation();
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (coolingRemainingMs(coolingUntil, Date.now()) <= 0) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => setNowTick(Date.now()), 1000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    const onChange = (next: AppStateStatus) => {
      if (next === "active") {
        setNowTick(Date.now());
        start();
      } else {
        stop();
      }
    };
    if (AppState.currentState === "active") start();
    const sub = AppState.addEventListener("change", onChange);
    return () => {
      stop();
      sub.remove();
    };
  }, [coolingUntil]);
  const coolingMs = coolingRemainingMs(coolingUntil, nowTick);
  if (coolingMs <= 0) return null;
  return (
    <Text style={style}>
      {t("marketplace.coolingCountdown", { time: formatCoolingCountdown(coolingMs) })}
    </Text>
  );
}

const MARKET_PAGE = 20;

export function MarketplaceView({ onBack, onRequireLogin, onGoWarehouse }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildMarketplaceStyles);
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const { marketplaceFeeRate } = useAppPublicConfig();
  const [tab, setTab] = useState<Tab>("market");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<MarketSort>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [marketOffset, setMarketOffset] = useState(0);
  const [marketItems, setMarketItems] = useState<MarketplaceListing[]>([]);
  const [marketHasMore, setMarketHasMore] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [myCredit, setMyCredit] = useState<number | null>(null);
  const [certListingId, setCertListingId] = useState<string | null>(null);
  const [certVideoUrl, setCertVideoUrl] = useState("");

  useEffect(() => {
    if (tab !== "market") return;
    void shouldShowMarketplaceGuide().then(setShowGuide);
  }, [tab]);

  const openChat = (listingId: string, title?: string) => {
    if (!authToken) {
      onRequireLogin?.();
      return;
    }
    setMarketplaceChatParams({ listingId, listingTitle: title });
    router.push(
      appViewToHref("marketplaceChat", { listingId, listingTitle: title }) as never,
    );
  };

  const renderTrustRow = (listingId: string, sellerCredit?: number | null) => (
    <View style={styles.trustRow}>
      {sellerCredit != null ? (
        <View style={styles.creditBadge} accessibilityRole="text">
          <Text style={styles.creditBadgeLabel}>{t("marketplace.creditBadgeLabel")}</Text>
          <Text style={styles.creditBadgeScore}>{Number(sellerCredit).toFixed(1)}</Text>
        </View>
      ) : (
        <View style={[styles.creditBadge, styles.creditBadgeMuted]}>
          <Text style={styles.creditBadgeMutedText}>{t("marketplace.creditUnavailable")}</Text>
        </View>
      )}
      <Pressable
        style={styles.certBadge}
        onPress={() => void handleViewCertificate(listingId)}
        accessibilityRole="button"
        accessibilityLabel={t("marketplace.certificateView")}
      >
        <Text style={styles.certBadgeText}>{t("marketplace.certificateBadge")}</Text>
      </Pressable>
    </View>
  );

  useEffect(() => {
    if (!authToken) {
      setMyCredit(null);
      return;
    }
    void fetchMarketplaceCredit(authToken)
      .then((c) => {
        setMyCredit(c.score);
      })
      .catch(() => {
        setMyCredit(null);
      });
  }, [authToken]);

  const marketQuery = useMarketplaceListingsQuery(keyword, sort, minPrice, maxPrice, marketOffset, tab === "market");
  const mineQuery = useMyMarketplaceListingsQuery(authToken, tab === "mine");
  const purchasedQuery = usePurchasedMarketplaceListingsQuery(authToken, tab === "purchased");

  const [stallTimedOut, setStallTimedOut] = useState(false);

  const reload = useCallback(async () => {
    setStallTimedOut(false);
    setMarketOffset(0);
    setMarketItems([]);
    setMarketHasMore(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.listings(keyword, sort, minPrice, maxPrice) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.mine(authToken) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.purchased(authToken) }),
    ]);
  }, [authToken, keyword, maxPrice, minPrice, queryClient, sort]);

  const activeQuery = tab === "market" ? marketQuery : tab === "mine" ? mineQuery : purchasedQuery;
  const queryPending = activeQuery.isPending && !activeQuery.isFetched && marketOffset === 0;
  const loadError = activeQuery.error
    ? parseError(activeQuery.error)
    : stallTimedOut
      ? t("api.requestRetry")
      : null;
  const initialLoading = queryPending && !loadError;
  const refreshing = activeQuery.isFetching && !activeQuery.isPending;

  useEffect(() => {
    if (!queryPending) {
      setStallTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setStallTimedOut(true), 12_000);
    return () => clearTimeout(timer);
  }, [queryPending, tab]);

  const items =
    tab === "market"
      ? marketItems
      : tab === "mine"
        ? (mineQuery.data ?? [])
        : (purchasedQuery.data ?? []);

  useEffect(() => {
    if (tab !== "market" || marketOffset !== 0) return;
    if (marketQuery.isSuccess && marketQuery.data) {
      setMarketItems(marketQuery.data);
      setMarketHasMore(marketQuery.data.length >= MARKET_PAGE);
    }
    if (marketQuery.isSuccess && Array.isArray(marketQuery.data) && marketQuery.data.length === 0) {
      setMarketItems([]);
      setMarketHasMore(false);
    }
  }, [tab, marketOffset, marketQuery.data, marketQuery.isSuccess]);

  const loadMoreMarket = useCallback(async () => {
    if (tab !== "market" || refreshing || !marketHasMore) return;
    if (!marketQuery.isSuccess) return;
    const nextOffset = marketOffset === 0 ? (marketQuery.data?.length ?? 0) : marketItems.length;
    if (nextOffset <= 0 && (marketQuery.data?.length ?? 0) === 0) return;
    const page = await queryClient.fetchQuery({
      queryKey: [...queryKeys.marketplace.listings(keyword, sort, minPrice, maxPrice), nextOffset] as const,
      queryFn: () =>
        fetchMarketplaceListingsPage({ keyword, sort, minPrice, maxPrice, offset: nextOffset }),
      networkMode: "always",
    });
    setMarketItems((prev) => (nextOffset === 0 ? page : [...prev, ...page]));
    setMarketOffset(nextOffset);
    setMarketHasMore(page.length >= MARKET_PAGE);
  }, [
    tab,
    refreshing,
    marketHasMore,
    marketOffset,
    marketQuery.data,
    marketQuery.isSuccess,
    marketItems.length,
    queryClient,
    keyword,
    sort,
    minPrice,
    maxPrice,
  ]);

  const handleBuy = async (item: MarketplaceListing) => {
    if (isIosDigitalGoodsRestricted()) {
      toast.info(t("actions.iosMarketplaceBuyBlocked"));
      return;
    }
    if (!authToken) {
      onRequireLogin?.();
      return;
    }
    const ok = await confirm({
      title: t("marketplace.buyConfirmTitle"),
      message: t("marketplace.buyConfirmMessage", {
        name: item.productName,
        price: formatCurrency(Number(item.price)),
      }),
      confirmLabel: t("marketplace.buyConfirmBtn"),
    });
    if (!ok) return;
    const perform = async () => {
      try {
        await buyMarketplaceListing(authToken, item.id);
        trackEvent("marketplace_buy", { listingId: item.id, price: item.price });
        toast.success(t("marketplace.coolingBuySuccess"));
        void reload();
      } catch (error) {
        reportAppError(toAppError(error), "marketplace_buy");
        toast.error(parseError(error));
      }
    };
    if (
      queueIfOffline(t("offline.actionBuy"), perform, {
        kind: "marketplaceBuy",
        token: authToken,
        payload: { listingId: item.id },
      })
    )
      return;
    await perform();
  };

  const handleCancel = async (item: MarketplaceListing) => {
    if (!authToken) return;
    const ok = await confirm({
      title: t("marketplace.cancelTitle"),
      message: t("marketplace.cancelMessage", { name: item.productName }),
      confirmLabel: t("marketplace.cancelBtn"),
      destructive: true,
    });
    if (!ok) return;
    const perform = async () => {
      try {
        await cancelMarketplaceListing(authToken, item.id);
        trackEvent("marketplace_list_cancel", { listingId: item.id });
        toast.success(t("marketplace.cancelSuccess"));
        void reload();
      } catch (error) {
        reportAppError(toAppError(error), "marketplace_cancel");
        toast.error(parseError(error));
      }
    };
    if (
      queueIfOffline(t("offline.actionDelist"), perform, {
        kind: "marketplaceCancel",
        token: authToken,
        payload: { listingId: item.id },
      })
    )
      return;
    await perform();
  };

  const handleCancelTrade = async (item: MarketplaceListing | PurchasedListing) => {
    if (!authToken) return;
    const ok = await confirm({
      title: t("marketplace.cancelTradeTitle"),
      message: t("marketplace.cancelTradeMessage", { name: item.productName }),
      confirmLabel: t("marketplace.cancelTradeBtn"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await cancelMarketplaceTrade(authToken, item.id);
      toast.success(t("marketplace.cancelTradeSuccess"));
      void reload();
    } catch (error) {
      reportAppError(toAppError(error), "marketplace_cancel_trade");
      toast.error(parseError(error));
    }
  };

  const handleViewCertificate = async (listingId: string) => {
    try {
      const cert = await fetchMarketplaceCertificate(authToken, listingId);
      toast.info(`${t("marketplace.certificate")}: ${cert.reviewStatus} ${cert.videoUrl ?? ""}`.trim());
    } catch {
      toast.info(t("marketplace.certificateNone"));
    }
  };

  const handleSubmitCertificate = async () => {
    if (!authToken || !certListingId || !certVideoUrl.trim()) return;
    try {
      await submitMarketplaceCertificate(authToken, certListingId, { videoUrl: certVideoUrl.trim() });
      toast.success(t("marketplace.certificateSubmitSuccess"));
      setCertListingId(null);
      setCertVideoUrl("");
    } catch (error) {
      toast.error(parseError(error));
    }
  };

  const listData = items as (MarketplaceListing | PurchasedListing)[];

  const purchasedShipLabel = (status: string | null) => {
    if (status === "SHIPPED") return t("marketplace.shipStatusShipped");
    return t("marketplace.shipStatusPending");
  };

  const sortOptions = [
    { key: "newest" as const, labelKey: "marketplace.sortNewest" },
    { key: "price_asc" as const, labelKey: "marketplace.sortPriceAsc" },
    { key: "price_desc" as const, labelKey: "marketplace.sortPriceDesc" },
  ] as const;

  return (
    <View style={styles.page}>
      <SubPageHeader title={t("marketplace.title")} onBack={onBack} />
      {myCredit != null ? (
        <Text style={styles.creditBanner}>{t("marketplace.myCredit", { score: myCredit.toFixed(1) })}</Text>
      ) : null}
      {certListingId ? (
        <View style={styles.certRow}>
          <TextInput
            style={styles.search}
            placeholder={t("marketplace.certificateSubmitPrompt")}
            placeholderTextColor={themeColors.textPlaceholder}
            value={certVideoUrl}
            onChangeText={setCertVideoUrl}
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.applyBtn, styles.certApply]}
            onPress={() => void handleSubmitCertificate()}
            accessibilityRole="button"
            accessibilityLabel={t("marketplace.certificateSubmit")}
          >
            <AppGradient
              colors={[themeColors.brandDark, themeColors.brandGradientEnd]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.applyBtnFill}
            >
              <Text style={styles.applyBtnText}>{t("marketplace.certificateSubmit")}</Text>
            </AppGradient>
          </Pressable>
        </View>
      ) : null}
      {showGuide && tab === "market" ? (
        <InlineGuideBanner
          testID="marketplaceGuideBanner"
          title={t("marketplace.guideTitle")}
          body={t("marketplace.guideBody")}
          onDismiss={() => {
            setShowGuide(false);
            void dismissMarketplaceGuide();
          }}
        />
      ) : null}
      {tab === "market" ? (
        <>
          <TextInput
            style={styles.search}
            placeholder={t("marketplace.searchPlaceholder")}
            placeholderTextColor={themeColors.textPlaceholder}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={() => void reload()}
            returnKeyType="search"
          />
          <View style={styles.filterRow}>
            {sortOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.filterChip, sort === opt.key ? styles.filterChipOn : null]}
                onPress={() => setSort(opt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: sort === opt.key }}
                accessibilityLabel={t(opt.labelKey)}
              >
                <Text style={[styles.filterChipText, sort === opt.key ? styles.filterChipTextOn : null]}>
                  {t(opt.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder={t("marketplace.minPrice")}
              placeholderTextColor={themeColors.textPlaceholder}
              keyboardType="decimal-pad"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <Text style={styles.priceDash}>—</Text>
            <TextInput
              style={styles.priceInput}
              placeholder={t("marketplace.maxPrice")}
              placeholderTextColor={themeColors.textPlaceholder}
              keyboardType="decimal-pad"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
            <Pressable
              style={styles.applyBtn}
              onPress={() => void reload()}
              accessibilityRole="button"
              accessibilityLabel={t("marketplace.filterApply")}
            >
              <AppGradient
                colors={[themeColors.brandDark, themeColors.brandGradientEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.applyBtnFill}
              >
                <Text style={styles.applyBtnText}>{t("marketplace.filterApply")}</Text>
              </AppGradient>
            </Pressable>
          </View>
        </>
      ) : null}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "market" ? styles.tabOn : null]}
          onPress={() => setTab("market")}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === "market" }}
          accessibilityLabel={t("marketplace.tabMarket")}
        >
          <Text style={[styles.tabText, tab === "market" ? styles.tabTextOn : null]}>{t("marketplace.tabMarket")}</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "mine" ? styles.tabOn : null]}
          onPress={() => {
            if (!authToken) {
              onRequireLogin?.();
              return;
            }
            setTab("mine");
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === "mine" }}
          accessibilityLabel={t("marketplace.tabMine")}
        >
          <Text style={[styles.tabText, tab === "mine" ? styles.tabTextOn : null]}>{t("marketplace.tabMine")}</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "purchased" ? styles.tabOn : null]}
          onPress={() => {
            if (!authToken) {
              onRequireLogin?.();
              return;
            }
            setTab("purchased");
          }}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === "purchased" }}
          accessibilityLabel={t("marketplace.tabPurchased")}
        >
          <Text style={[styles.tabText, tab === "purchased" ? styles.tabTextOn : null]}>{t("marketplace.tabPurchased")}</Text>
        </Pressable>
      </View>
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {shouldShowListSkeleton(initialLoading, listData.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={5} />
      ) : (
      <OptimizedFlatList
        listVariant="row"
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void reload()} tintColor={themeColors.brand} />}
        onEndReached={() => void loadMoreMarket()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={listEmptyWhenOk(
          loadError,
          <EmptyState
            title={
              !authToken && (tab === "mine" || tab === "purchased")
                ? t("marketplace.guestEmptyTitle")
                : tab === "market"
                  ? t("marketplace.emptyMarket")
                  : tab === "mine"
                    ? t("marketplace.emptyMine")
                    : t("marketplace.emptyPurchased")
            }
            description={
              !authToken && (tab === "mine" || tab === "purchased")
                ? t("marketplace.guestEmptyDesc")
                : tab === "market"
                  ? t("marketplace.emptyMarketDesc")
                  : tab === "mine"
                    ? t("marketplace.emptyMineDesc")
                    : t("marketplace.emptyPurchasedDesc")
            }
            variant="plain"
            actionLabel={
              !authToken && (tab === "mine" || tab === "purchased") && onRequireLogin
                ? t("marketplace.goLogin")
                : tab === "mine" && onGoWarehouse
                  ? t("marketplace.goWarehouseList")
                  : undefined
            }
            onAction={
              !authToken && (tab === "mine" || tab === "purchased") && onRequireLogin
                ? onRequireLogin
                : onGoWarehouse
            }
          />,
        )}
        renderItem={({ item }) => {
          if (tab === "purchased") {
            const row = item as PurchasedListing;
            return (
              <Pressable style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}>
                <RemoteImage
                  uri={row.cover || resolveProductImageUrl(row.id, row.productName)}
                  style={styles.cover}
                  priority="low"
                />
                <View style={styles.meta}>
                  <Text style={styles.name} numberOfLines={2}>{row.productName}</Text>
                  <Text style={styles.tier}>
                    {qualityLabelFromRaw(row.qualityType, t)} ·{" "}
                    {isPendingExternal(row)
                      ? listingStatusLabel("PENDING_EXTERNAL", t)
                      : row.status === "COOLING"
                        ? listingStatusLabel("COOLING", t)
                        : purchasedShipLabel(row.buyerShipStatus)}
                  </Text>
                  {isPendingExternal(row) ? (
                    <Text style={styles.pendingHint}>{t("marketplace.pendingExternalHint")}</Text>
                  ) : null}
                  <Text style={styles.price}>{formatCurrency(Number(row.price))}</Text>
                  {renderTrustRow(row.id, row.sellerCredit)}
                  {row.status === "COOLING" ? (
                    <MarketplaceCoolingLabel coolingUntil={row.coolingUntil} style={styles.cooling} />
                  ) : null}
                  {row.status === "COOLING" ? (
                    <Pressable
                      style={({ pressed }) => [styles.cancelBtn, pressed ? styles.cardPressed : null]}
                      onPress={() => handleCancelTrade(row)}
                      accessibilityRole="button"
                      accessibilityLabel={t("marketplace.cancelTradeBtn")}
                    >
                      <Text style={styles.cancelText}>{t("marketplace.cancelTradeBtn")}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={({ pressed }) => [styles.chatOpenBtn, pressed ? styles.cardPressed : null]}
                    onPress={() => openChat(row.id, row.productName)}
                    accessibilityRole="button"
                    accessibilityLabel={t("marketplace.chat")}
                  >
                    <Text style={styles.chatOpenText}>{t("marketplace.chat")}</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }
          const row = item as MarketplaceListing;
          return (
          <Pressable style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}>
            <RemoteImage
              uri={row.cover || resolveProductImageUrl(row.productId, row.productName)}
              style={styles.cover}
              priority="low"
            />
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={2}>
                {row.productName}
              </Text>
              <Text style={styles.tier}>
                {qualityLabelFromRaw(row.qualityType, t)} · {displayListingStatus(row, t)}
              </Text>
              {tab === "mine" && isPendingExternal(row) ? (
                <Text style={styles.pendingHint}>{t("marketplace.pendingExternalHint")}</Text>
              ) : null}
              <Text style={styles.price}>{formatCurrency(Number(row.price))}</Text>
              {renderTrustRow(row.id, row.sellerCredit)}
              {tab === "mine" ? (
                <Text style={styles.netProceeds}>
                  {t("marketplace.netProceeds", {
                    amount: formatCurrency(estimateMarketplaceNetProceeds(Number(row.price), marketplaceFeeRate)),
                  })}
                </Text>
              ) : null}
              {row.status === "COOLING" ? (
                <MarketplaceCoolingLabel coolingUntil={row.coolingUntil} style={styles.cooling} />
              ) : null}
              {tab === "market" && !isIosDigitalGoodsRestricted() ? (
                <Pressable
                  style={({ pressed }) => [styles.buyBtn, pressed ? styles.cardPressed : null]}
                  onPress={() => handleBuy(row)}
                  accessibilityRole="button"
                  accessibilityLabel={t("marketplace.buyWithBalance")}
                >
                  <AppGradient
                    colors={[themeColors.brandDark, themeColors.brandGradientEnd]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.buyBtnFill}
                  >
                    <Text style={styles.buyText}>{t("marketplace.buyWithBalance")}</Text>
                  </AppGradient>
                </Pressable>
              ) : row.status === "ON_SALE" ? (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.cancelBtn, pressed ? styles.cardPressed : null]}
                    onPress={() => handleCancel(row)}
                    accessibilityRole="button"
                    accessibilityLabel={t("marketplace.delist")}
                  >
                    <Text style={styles.cancelText}>{t("marketplace.delist")}</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.linkBtn, pressed ? styles.cardPressed : null]}
                    onPress={() => {
                      setCertListingId(row.id);
                      setCertVideoUrl("");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("marketplace.certificateSubmit")}
                  >
                    <Text style={styles.linkText}>{t("marketplace.certificateSubmit")}</Text>
                  </Pressable>
                </>
              ) : null}
              {tab === "mine" ? (
                <Pressable
                  style={({ pressed }) => [styles.chatOpenBtn, pressed ? styles.cardPressed : null]}
                  onPress={() => openChat(row.id, row.productName)}
                  accessibilityRole="button"
                  accessibilityLabel={t("marketplace.chat")}
                >
                  <Text style={styles.chatOpenText}>{t("marketplace.chat")}</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
          );
        }}
      />
      )}
    </View>
  );
}

function buildMarketplaceStyles(colors: ThemeColors) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPage },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.chipBorder,
  },
  filterChipText: { fontSize: typography.caption, fontWeight: "600", color: colors.textMuted },
  filterChipTextOn: { color: colors.brandText, fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: layout.screenPaddingX,
    marginBottom: spacing.sm,
  },
  priceInput: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: typography.caption,
    color: colors.textPrimary,
  },
  priceDash: { color: colors.textMuted },
  applyBtn: {
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  applyBtnFill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: { color: colors.textOnBrand, fontWeight: "700", fontSize: typography.caption },
  search: {
    marginHorizontal: layout.screenPaddingX,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  tabs: {
    flexDirection: "row",
    gap: 0,
    marginHorizontal: layout.screenPaddingX,
    marginBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabOn: {
    borderBottomColor: colors.brand,
  },
  tabText: { fontWeight: "600", color: colors.textMuted, fontSize: typography.caption },
  tabTextOn: { color: colors.brandText, fontWeight: "800" },
  list: { padding: layout.screenPaddingX, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.profileHeroGlassBorder,
    ...shadows.cardSm,
  },
  cardPressed: { opacity: 0.9 },
  cover: {
    width: 108,
    height: 108,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgMuted,
  },
  meta: { flex: 1, gap: 4, justifyContent: "center" },
  name: { fontSize: typography.body, fontWeight: "700", color: colors.textPrimary },
  tier: { fontSize: typography.caption, color: colors.textSecondary },
  price: { fontSize: typography.h3, fontWeight: "800", color: colors.brandText, marginTop: 4 },
  netProceeds: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: "600" },
  cooling: { fontSize: typography.caption, color: colors.brand, fontWeight: "700", marginTop: 2 },
  pendingHint: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 18,
  },
  creditBanner: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  certRow: { marginBottom: spacing.sm, gap: spacing.sm },
  certApply: { marginHorizontal: layout.screenPaddingX, alignSelf: "stretch" },
  linkBtn: { marginTop: spacing.xs, paddingVertical: 2 },
  linkText: { color: colors.brand, fontWeight: "600", fontSize: typography.caption },
  buyBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  buyBtnFill: {
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buyText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption, letterSpacing: 0.3 },
  cancelBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bgSoft,
  },
  cancelText: { color: colors.textSecondary, fontWeight: "700", fontSize: typography.caption },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    backgroundColor: colors.bgBrandSoft,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  creditBadgeMuted: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.border,
    borderWidth: 1,
  },
  creditBadgeLabel: {
    fontSize: typography.micro,
    fontWeight: "800",
    color: colors.brandText,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  creditBadgeScore: {
    fontSize: typography.body,
    fontWeight: "900",
    color: colors.brandText,
  },
  creditBadgeMutedText: {
    fontSize: typography.micro,
    fontWeight: "600",
    color: colors.textMuted,
  },
  certBadge: {
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.chipBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  certBadgeText: {
    fontSize: typography.micro,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 0.2,
  },
  chatOpenBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatOpenText: { color: colors.brandText, fontWeight: "700", fontSize: typography.caption },
  });
}
