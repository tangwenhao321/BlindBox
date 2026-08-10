import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { RemoteImage } from "./ui/RemoteImage";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import {
  buyMarketplaceListing,
  cancelMarketplaceListing,
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
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { useAuthToken } from "../hooks/useAuthToken";
import {
  useMarketplaceListingsQuery,
  useMyMarketplaceListingsQuery,
  usePurchasedMarketplaceListingsQuery,
  type MarketSort,
} from "../query/hooks/useMarketplaceListingsQuery";
import { queryKeys } from "../query/keys";
import { fetchMarketplaceListingsPage } from "../query/fetchers";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { InlineGuideBanner } from "./ui/InlineGuideBanner";
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
  return status;
}

const MARKET_PAGE = 20;

export function MarketplaceView({ onBack, onRequireLogin, onGoWarehouse }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildMarketplaceStyles);
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("market");
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState<MarketSort>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [marketOffset, setMarketOffset] = useState(0);
  const [marketItems, setMarketItems] = useState<MarketplaceListing[]>([]);
  const [marketHasMore, setMarketHasMore] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (tab !== "market") return;
    void shouldShowMarketplaceGuide().then(setShowGuide);
  }, [tab]);

  const marketQuery = useMarketplaceListingsQuery(keyword, sort, minPrice, maxPrice, marketOffset, tab === "market");
  const mineQuery = useMyMarketplaceListingsQuery(authToken, tab === "mine");
  const purchasedQuery = usePurchasedMarketplaceListingsQuery(authToken, tab === "purchased");

  const reload = useCallback(async () => {
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
  const loadError = activeQuery.error ? parseError(activeQuery.error) : null;
  const initialLoading = activeQuery.isLoading && marketOffset === 0;
  const refreshing = activeQuery.isFetching && !activeQuery.isLoading;

  const items =
    tab === "market"
      ? marketItems
      : tab === "mine"
        ? (mineQuery.data ?? [])
        : (purchasedQuery.data ?? []);

  useEffect(() => {
    if (tab !== "market" || marketOffset !== 0) return;
    if (marketQuery.data) {
      setMarketItems(marketQuery.data);
      setMarketHasMore(marketQuery.data.length >= MARKET_PAGE);
    }
  }, [tab, marketOffset, marketQuery.data]);

  const loadMoreMarket = useCallback(async () => {
    if (tab !== "market" || refreshing || !marketHasMore) return;
    const nextOffset = marketOffset === 0 ? (marketQuery.data?.length ?? 0) : marketItems.length;
    const page = await queryClient.fetchQuery({
      queryKey: [...queryKeys.marketplace.listings(keyword, sort, minPrice, maxPrice), nextOffset] as const,
      queryFn: () =>
        fetchMarketplaceListingsPage({ keyword, sort, minPrice, maxPrice, offset: nextOffset }),
    });
    setMarketItems((prev) => (marketOffset === 0 ? page : [...prev, ...page]));
    setMarketOffset(nextOffset);
    setMarketHasMore(page.length >= MARKET_PAGE);
  }, [
    tab,
    refreshing,
    marketHasMore,
    marketOffset,
    marketQuery.data,
    marketItems.length,
    queryClient,
    keyword,
    sort,
    minPrice,
    maxPrice,
  ]);

  const handleBuy = async (item: MarketplaceListing) => {
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
        toast.success(t("marketplace.buySuccess"));
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
              keyboardType="decimal-pad"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <Text style={styles.priceDash}>—</Text>
            <TextInput
              style={styles.priceInput}
              placeholder={t("marketplace.maxPrice")}
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
              <Text style={styles.applyBtnText}>{t("marketplace.filterApply")}</Text>
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
              tab === "market"
                ? t("marketplace.emptyMarket")
                : tab === "mine"
                  ? t("marketplace.emptyMine")
                  : t("marketplace.emptyPurchased")
            }
            description={
              tab === "market"
                ? t("marketplace.emptyMarketDesc")
                : tab === "mine"
                  ? t("marketplace.emptyMineDesc")
                  : t("marketplace.emptyPurchasedDesc")
            }
            variant="plain"
            actionLabel={tab === "mine" && onGoWarehouse ? t("marketplace.goWarehouseList") : undefined}
            onAction={onGoWarehouse}
          />,
        )}
        renderItem={({ item }) => {
          if (tab === "purchased") {
            const row = item as PurchasedListing;
            return (
              <View style={styles.card}>
                <RemoteImage
                  uri={row.cover || resolveProductImageUrl(row.id, row.productName)}
                  style={styles.cover}
                />
                <View style={styles.meta}>
                  <Text style={styles.name} numberOfLines={2}>{row.productName}</Text>
                  <Text style={styles.tier}>
                    {qualityLabelFromRaw(row.qualityType, t)} · {purchasedShipLabel(row.buyerShipStatus)}
                  </Text>
                  <Text style={styles.price}>{formatCurrency(Number(row.price))}</Text>
                </View>
              </View>
            );
          }
          const row = item as MarketplaceListing;
          return (
          <View style={styles.card}>
            <RemoteImage
              uri={row.cover || resolveProductImageUrl(row.productId, row.productName)}
              style={styles.cover}
            />
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={2}>
                {row.productName}
              </Text>
              <Text style={styles.tier}>
                {qualityLabelFromRaw(row.qualityType, t)} · {listingStatusLabel(row.status, t)}
              </Text>
              <Text style={styles.price}>{formatCurrency(Number(row.price))}</Text>
              {tab === "mine" ? (
                <Text style={styles.netProceeds}>
                  {t("marketplace.netProceeds", { amount: formatCurrency(estimateMarketplaceNetProceeds(Number(row.price))) })}
                </Text>
              ) : null}
              {tab === "market" ? (
                <Pressable
                  style={styles.buyBtn}
                  onPress={() => handleBuy(row)}
                  accessibilityRole="button"
                  accessibilityLabel={t("marketplace.buyWithBalance")}
                >
                  <Text style={styles.buyText}>{t("marketplace.buyWithBalance")}</Text>
                </Pressable>
              ) : row.status === "ON_SALE" ? (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(row)}
                  accessibilityRole="button"
                  accessibilityLabel={t("marketplace.delist")}
                >
                  <Text style={styles.cancelText}>{t("marketplace.delist")}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
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
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterChipText: { fontSize: typography.caption, fontWeight: "700", color: colors.textSecondary },
  filterChipTextOn: { color: colors.textOnBrand },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: layout.screenPaddingX,
    marginBottom: spacing.sm,
  },
  priceInput: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: typography.caption,
  },
  priceDash: { color: colors.textMuted },
  applyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
  },
  applyBtnText: { color: colors.textOnBrand, fontWeight: "700", fontSize: typography.caption },
  search: {
    marginHorizontal: layout.screenPaddingX,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { fontWeight: "700", color: colors.textSecondary, fontSize: typography.caption },
  tabTextOn: { color: colors.textOnBrand },
  list: { padding: layout.screenPaddingX, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cover: { width: 72, height: 72, borderRadius: radius.md },
  meta: { flex: 1, gap: 4 },
  name: { fontSize: typography.body, fontWeight: "700", color: colors.textPrimary },
  tier: { fontSize: typography.caption, color: colors.textSecondary },
  price: { fontSize: typography.h3, fontWeight: "800", color: colors.brand, marginTop: 4 },
  netProceeds: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: "600" },
  buyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  buyText: { color: "#fff", fontWeight: "700", fontSize: typography.caption },
  cancelBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { color: colors.textSecondary, fontWeight: "700", fontSize: typography.caption },
  });
}
