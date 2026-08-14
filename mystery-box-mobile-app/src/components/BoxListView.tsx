import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListRenderItem , OptimizedListRef } from "./ui/OptimizedFlatList";

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuthToken } from "../hooks/useAuthToken";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import type { HomeCatalogSideData } from "../hooks/useHomeCatalogSideData";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { HomeBoxCard } from "./home/HomeBoxCard";
import { HomeCatalogListHeader } from "./home/HomeCatalogListHeader";
import { HomeNewcomerBar } from "./home/HomeNewcomerBar";
import { HomeTrustBadges } from "./home/HomeTrustBadges";
import { MallSearchBar } from "./mall/MallSearchBar";
import { MallCategoryNav } from "./mall/MallCategoryNav";
import { MallPageHeader } from "./mall/MallPageHeader";
import { MallProductCard } from "./mall/MallProductCard";
import { HomeBannerCarousel } from "./home/HomeBannerCarousel";
import { EmptyState } from "./EmptyState";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListFooterLoading } from "./ui/ListFooterLoading";
import { ListSkeleton } from "./ListSkeleton";
import { font, layout, radius, spacing, typography } from "../styles/tokens";
import { resolveBoxImageUrl } from "../utils/boxImage";
import type { ThemeColors } from "../styles/themes";
import type { MysteryBox, Order } from "../types";
import { trackEvent } from "../utils/analytics";
import { getBestPackTeaser } from "../services/drawPackService";
import { dedupeMysteryBoxes, isPitySeriesBox } from "../utils/boxDisplay";
import { getNewcomerBarPrice } from "../utils/newcomerOffer";
import { fetchNewcomerMissions } from "../services/newcomerMissionService";
import { pickLatestUnclaimedMission } from "../utils/newcomerMissionDisplay";
import { rememberListScroll, peekListScroll } from "../utils/listScrollMemory";
import { RevealFeedTicker } from "./ui/RevealFeedTicker";
import { WinRecordModal } from "./WinRecordModal";
import { getRevealRemoteConfig } from "../effects/revealRemote";
import { consumeWeeklyThemeBanner } from "../effects/revealThemeBanner";
import { getAppLocale } from "../utils/i18nLocale";


type Props = {
  mode?: "home" | "mall";
  boxes: MysteryBox[];
  pageLoading: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  bannerUri?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  onRefresh: () => void;
  onLoadMore?: () => void;
  onOpenDetails: (id: string) => void;
  onMallCategoryChange?: (categoryId?: string) => void;
  onMallSearch?: (keyword: string) => void;
  mallKeyword?: string;
  onContactSupport?: () => void;
  showNewcomerBar?: boolean;
  onNewcomerPress?: () => void;
  orders?: Order[];
  onContinuePendingPayment?: (orderId: string) => void;
  onViewAllPending?: () => void;
  onOpenCatalogSearch?: (keyword?: string) => void;
  onOpenPlayGuide?: () => void;
  onOpenProbabilityDisclosure?: () => void;
  catalogLoadError?: string | null;
  onRetryCatalog?: () => void;
  catalogSideData: HomeCatalogSideData;
};

type HomeTab = { key: string; label: string; kind: "all" | "category" | "pity"; categoryId?: string };

type SortKey = "new" | "sales" | "price";

export const BoxListView = memo(function BoxListView(props: Props) {
  const {
    mode = "home",
    boxes,
    pageLoading,
    hasMore,
    loadingMore,
    bannerUri,
    bannerTitle,
    bannerSubtitle,
    onRefresh,
    onLoadMore,
    onOpenDetails,
    onMallCategoryChange,
    onMallSearch,
    mallKeyword,
    onContactSupport,
    showNewcomerBar,
    onNewcomerPress,
    orders = [],
    onContinuePendingPayment,
    onViewAllPending,
    onOpenCatalogSearch,
    onOpenPlayGuide,
    onOpenProbabilityDisclosure,
    catalogLoadError,
    onRetryCatalog,
    catalogSideData: sideData,
  } = props;
  const token = useAuthToken();

  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildBoxListStyles);

  const [homeTabKey, setHomeTabKey] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("new");
  const [priceAsc, setPriceAsc] = useState(true);
  const [mallCategoryId, setMallCategoryId] = useState<string | undefined>();
  const [winRecordVisible, setWinRecordVisible] = useState(false);
  const [weeklyThemeBanner, setWeeklyThemeBanner] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState(mallKeyword ?? "");
  const [newcomerMissionsDone, setNewcomerMissionsDone] = useState(0);
  const [newcomerMissionsTotal, setNewcomerMissionsTotal] = useState(0);
  const [latestNewcomerMissionText, setLatestNewcomerMissionText] = useState<string | null>(null);
  const listRef = useRef<OptimizedListRef<MysteryBox>>(null);
  const scrollKey = mode === "mall" ? "catalog:mall" : `catalog:home:${homeTabKey}:${sortKey}:${priceAsc ? "asc" : "desc"}`;
  const newcomerBarPrice = useMemo(() => getNewcomerBarPrice(boxes), [boxes]);

  useEffect(() => {
    const offset = peekListScroll(scrollKey);
    if (offset == null || offset <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [scrollKey]);

  useEffect(() => {
    if (mode !== "home") return;
    const locale = getAppLocale();
    const lang = locale.startsWith("vi") ? "vi" : locale.startsWith("en") ? "en" : "zh";
    void consumeWeeklyThemeBanner(lang).then((msg) => {
      if (msg) setWeeklyThemeBanner(msg);
    });
  }, [mode]);

  useEffect(() => {
    if (!showNewcomerBar || !token) {
      setNewcomerMissionsDone(0);
      setNewcomerMissionsTotal(0);
      setLatestNewcomerMissionText(null);
      return;
    }
    let cancelled = false;
    void fetchNewcomerMissions(token)
      .then((rows) => {
        if (cancelled) return;
        setNewcomerMissionsTotal(rows.length);
        setNewcomerMissionsDone(rows.filter((m) => m.completed).length);
        const latest = pickLatestUnclaimedMission(rows);
        setLatestNewcomerMissionText(latest?.title ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setNewcomerMissionsDone(0);
          setNewcomerMissionsTotal(0);
          setLatestNewcomerMissionText(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showNewcomerBar, token]);

  useEffect(() => {
    setSearchDraft(mallKeyword ?? "");
  }, [mallKeyword]);

  const homeTabs = useMemo((): HomeTab[] => {
    const tabs: HomeTab[] = [{ key: "all", label: t("home.tabAll"), kind: "all" }];
    for (const cat of sideData.homeCategories) {
      tabs.push({ key: cat.id, label: cat.name, kind: "category", categoryId: cat.id });
    }
    tabs.push({ key: "pity", label: t("home.tabPity"), kind: "pity" });
    return tabs;
  }, [sideData.homeCategories, t]);

  const activeHomeTab = homeTabs.find((tab) => tab.key === homeTabKey) ?? homeTabs[0];

  const handleOpenDetails = useCallback(
    (id: string) => {
      const item = boxes.find((b) => b.id === id);
      if (item) {
        trackEvent(mode === "mall" ? "mall_box_click" : "home_box_click", {
          boxId: item.id,
          boxName: item.name,
          price: item.price,
        });
      }
      onOpenDetails(id);
    },
    [boxes, mode, onOpenDetails],
  );

  const drawCountByBoxId = useMemo(() => {
    const map = new Map<string, number>();
    for (const hot of sideData.homeSummary?.hotBoxes ?? []) {
      map.set(hot.id, hot.drawCount7d);
    }
    return map;
  }, [sideData.homeSummary?.hotBoxes]);

  const recommendBoxes = useMemo(() => {
    const listed = new Set(boxes.map((b) => b.id));
    return sideData.recommendBoxes.filter((b) => !listed.has(b.id));
  }, [boxes, sideData.recommendBoxes]);

  const filteredBoxes = useMemo(() => {
    let list = [...boxes];

    if (mode === "home") {
      if (activeHomeTab?.kind === "category" && activeHomeTab.categoryId) {
        list = list.filter((item) => item.category?.id === activeHomeTab.categoryId);
      } else if (activeHomeTab?.kind === "pity") {
        list = list.filter((item) => isPitySeriesBox(item));
      }
    }

    if (sortKey === "sales") {
      list.sort((a, b) => (drawCountByBoxId.get(b.id) ?? 0) - (drawCountByBoxId.get(a.id) ?? 0));
    } else if (sortKey === "price") {
      list.sort((a, b) => (priceAsc ? a.price - b.price : b.price - a.price));
    }
    return dedupeMysteryBoxes(list);
  }, [activeHomeTab, boxes, drawCountByBoxId, mode, priceAsc, sortKey]);

  const handleBannerSlidePress = useCallback(
    (index: number) => {
      if (mode === "home" && sideData.homeSummary?.banners?.length) {
        const banner = sideData.homeSummary.banners[index];
        if (banner?.navigatorType === "BLIND_BOX" && banner.navigatorId) {
          onOpenDetails(banner.navigatorId);
          return;
        }
        onOpenPlayGuide?.();
        return;
      }
      if (mode === "home") {
        if (index === 0) onOpenPlayGuide?.();
        else onOpenProbabilityDisclosure?.();
        return;
      }
      if (mode === "mall") {
        if (index === 0) onOpenPlayGuide?.();
        else if (index === 1) onOpenProbabilityDisclosure?.();
      }
    },
    [mode, onOpenDetails, onOpenPlayGuide, onOpenProbabilityDisclosure, sideData.homeSummary?.banners],
  );

  const packTeaserFor = useCallback(
    (box: MysteryBox) => getBestPackTeaser(box.price, sideData.drawPackConfigs),
    [sideData.drawPackConfigs],
  );

  const mallCategoryLabel = useMemo(() => {
    if (!mallCategoryId) return null;
    return sideData.apiCategories.find((c) => c.id === mallCategoryId)?.name;
  }, [mallCategoryId, sideData.apiCategories]);

  const hasActiveEmptyFilter = useMemo(() => {
    if (mode === "mall") return Boolean(mallKeyword?.trim() || mallCategoryId);
    return Boolean(activeHomeTab && activeHomeTab.kind !== "all");
  }, [activeHomeTab, mallCategoryId, mallKeyword, mode]);

  const clearEmptyFilters = useCallback(() => {
    if (mode === "home") {
      setHomeTabKey("all");
      return;
    }
    setMallCategoryId(undefined);
    onMallCategoryChange?.(undefined);
    setSearchDraft("");
    onMallSearch?.("");
  }, [mode, onMallCategoryChange, onMallSearch]);

  const emptyActionLabel = hasActiveEmptyFilter
    ? t("home.emptyClearFilters")
    : t("home.emptyRefresh");
  const emptyOnAction = hasActiveEmptyFilter
    ? clearEmptyFilters
    : () => {
        (onRetryCatalog ?? onRefresh)();
      };

  const bannerSlides = useMemo(() => {
    if (mode === "home" && sideData.homeSummary?.banners?.length) {
      return sideData.homeSummary.banners.map((banner) => ({
        uri: resolveBoxImageUrl({
          id: banner.id ?? "banner",
          name: banner.content ?? "banner",
          cover: banner.picture,
        }),
        title: banner.content || t("home.bannerActivity"),
        subtitle: "",
        cta: t("home.bannerCtaBrowse"),
      }));
    }
    return [
      {
        uri: bannerUri,
        title: bannerTitle || (mode === "mall" ? t("home.bannerMallFeatured") : t("home.bannerPlayGuide")),
        subtitle: bannerSubtitle || (mode === "mall" ? t("home.bannerMallSub") : t("home.bannerPlayGuideSub")),
        cta: mode === "mall" ? t("home.bannerGoMall") : t("home.bannerLearnRules"),
      },
      {
        title: t("home.bannerProbability"),
        subtitle: t("home.bannerProbabilitySub"),
        cta: t("home.bannerViewDetails"),
      },
    ];
  }, [bannerSubtitle, bannerTitle, bannerUri, mode, sideData.homeSummary?.banners, t]);

  const tickerItems = useMemo(
    () =>
      sideData.drawFeed.map((item) => ({
        text: t("home.tickerDraw", {
          name: item.displayName,
          product: item.productName,
          lastOne: item.lastOne ? t("home.tickerLastOne") : "",
        }),
        qualityType: item.qualityType,
      })),
    [sideData.drawFeed, t],
  );

  const handleSortPress = (key: SortKey) => {
    if (key === "price" && sortKey === "price") {
      setPriceAsc((v) => !v);
      return;
    }
    setSortKey(key);
  };

  const handleMallCategory = (categoryId?: string) => {
    setMallCategoryId(categoryId);
    onMallCategoryChange?.(categoryId);
  };

  const listLoading = shouldShowListSkeleton(pageLoading, boxes.length, catalogLoadError ?? null);

  const renderHomeItem: ListRenderItem<MysteryBox> = ({ item, index }) => (
    <HomeBoxCard item={item} index={index} packTeaser={packTeaserFor(item)} onPress={handleOpenDetails} />
  );

  const renderMallItem: ListRenderItem<MysteryBox> = ({ item, index }) => (
    <View style={styles.mallCell}>
      <MallProductCard item={item} index={index} onPress={handleOpenDetails} />
    </View>
  );

  const listHeader =
    mode === "home" ? (
      <HomeCatalogListHeader
        token={token}
        orders={orders}
        bannerSlides={bannerSlides}
        tickerItems={tickerItems}
        homeSummary={sideData.homeSummary}
        recommendBoxes={recommendBoxes}
        recommendVariant={sideData.recommendVariant}
        homeTabs={homeTabs}
        homeTabKey={homeTabKey}
        sortKey={sortKey}
        priceAsc={priceAsc}
        filteredCount={filteredBoxes.length}
        themeColors={themeColors}
        onPressSearch={() => onOpenCatalogSearch?.()}
        onContactSupport={onContactSupport}
        onContinuePendingPayment={onContinuePendingPayment}
        onViewAllPending={onViewAllPending}
        onPressBannerSlide={handleBannerSlidePress}
        onPressTicker={() => setWinRecordVisible(true)}
        onOpenProbabilityDisclosure={onOpenProbabilityDisclosure}
        onOpenPlayGuide={onOpenPlayGuide}
        onOpenBox={handleOpenDetails}
        onHomeTabChange={setHomeTabKey}
        onSortPress={handleSortPress}
      />
    ) : (
      <View style={styles.headerWrap}>
        <MallPageHeader />
        <HomeBannerCarousel slides={bannerSlides} onPressSlide={handleBannerSlidePress} />
        <HomeTrustBadges onPressProbability={onOpenProbabilityDisclosure} onPressPlayGuide={onOpenPlayGuide} />
        <MallSearchBar
          value={searchDraft}
          onChangeText={setSearchDraft}
          onSubmit={(keyword) => onMallSearch?.(keyword)}
          onClear={() => {
            setSearchDraft("");
            onMallSearch?.("");
          }}
          loading={pageLoading}
        />
        <MallCategoryNav categories={sideData.apiCategories} activeId={mallCategoryId} onSelect={handleMallCategory} />
        <Text style={styles.aisleTitle}>
          {mallKeyword
            ? t("mall.searchResultHint", { keyword: mallKeyword })
            : mallCategoryLabel
              ? t("mall.aisleTitle", { name: mallCategoryLabel })
              : t("mall.aisleAll")}
        </Text>
      </View>
    );

  const listHeaderWithError = (
    <>
      {catalogLoadError ? <ListErrorBanner message={catalogLoadError} onRetry={onRetryCatalog} /> : null}
      {sideData.categoryLoadError ? (
        <ListErrorBanner
          message={t("home.categoryLoadFailed", { message: sideData.categoryLoadError })}
          onRetry={sideData.retryCategories}
        />
      ) : null}
      {listHeader}
    </>
  );

  return (
    <View style={styles.container}>
      {mode === "home" && weeklyThemeBanner ? (
        <Pressable
          style={styles.weeklyThemeBanner}
          onPress={() => setWeeklyThemeBanner(null)}
          accessibilityRole="button"
          accessibilityLabel={weeklyThemeBanner}
        >
          <Text style={styles.weeklyThemeBannerText}>{weeklyThemeBanner}</Text>
        </Pressable>
      ) : null}
      {mode === "home" && getRevealRemoteConfig().feedTickerEnabled ? (
        <RevealFeedTicker visible boxId={null} />
      ) : null}
      <OptimizedFlatList
        ref={listRef}
        key={mode}
        listVariant={mode === "mall" ? "card" : "row"}
        data={filteredBoxes}
        keyExtractor={(item) => item.id}
        numColumns={mode === "mall" ? 2 : 1}
        refreshing={pageLoading}
        onRefresh={onRefresh}
        onScroll={(event) => {
          rememberListScroll(scrollKey, event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={120}
        onEndReached={() => {
          if (!hasMore || !onLoadMore || pageLoading || loadingMore || filteredBoxes.length === 0) return;
          onLoadMore();
        }}
        onEndReachedThreshold={0.35}
        contentContainerStyle={{
          paddingBottom: layout.screenPaddingBottom + (showNewcomerBar ? 56 : 0),
          paddingHorizontal: layout.screenPaddingX,
        }}
        ListHeaderComponent={listHeaderWithError}
        renderItem={mode === "mall" ? renderMallItem : renderHomeItem}
        ListEmptyComponent={
          listLoading ? (
            <ListSkeleton rows={mode === "mall" ? 6 : 5} variant={mode === "mall" ? "grid" : "card"} />
          ) : (
            listEmptyWhenOk(
              catalogLoadError ?? null,
              <EmptyState
                title={mode === "mall" && mallKeyword ? t("catalogSearch.emptyTitle") : t("home.emptyTitle")}
                description={
                  mode === "mall" && mallKeyword
                    ? t("mall.emptySearch", { keyword: mallKeyword })
                    : mode === "mall" && mallCategoryId
                      ? t("home.emptyFilterMall", { category: mallCategoryLabel || t("home.emptyCategoryFallback") })
                      : mode === "home" && activeHomeTab?.kind !== "all"
                        ? t("home.emptyFilterHome")
                        : t("home.emptyRetry")
                }
                actionLabel={emptyActionLabel}
                onAction={emptyOnAction}
              />,
            )
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ListFooterLoading />
          ) : hasMore ? (
            <Text style={styles.loadMoreText}>{t("home.loadMore")}</Text>
          ) : boxes.length > 0 ? (
            <Text style={styles.loadMoreText}>{t("home.loadAll")}</Text>
          ) : null
        }
      />
      {mode === "home" && showNewcomerBar && onNewcomerPress ? (
        <HomeNewcomerBar
          onPress={onNewcomerPress}
          price={newcomerBarPrice}
          missionsCompleted={newcomerMissionsDone}
          missionsTotal={newcomerMissionsTotal}
          latestMissionText={latestNewcomerMissionText}
        />
      ) : null}
      {mode === "home" ? (
        <WinRecordModal
          visible={winRecordVisible}
          boxId={null}
          token={token}
          products={[]}
          onClose={() => setWinRecordVisible(false)}
        />
      ) : null}
    </View>
  );
});

function buildBoxListStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPage },
    weeklyThemeBanner: {
      marginHorizontal: layout.screenPaddingX,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.bgCard,
    },
    weeklyThemeBannerText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: "700",
    },
    headerWrap: { marginBottom: spacing.sm, backgroundColor: colors.bgPage },
    mallCategoryHint: {
      fontSize: typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      fontWeight: "600",
    },
    aisleTitle: {
      ...font("bodySemiBold"),
      fontSize: typography.bodyLg,
      fontWeight: "800",
      color: colors.brandText,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      letterSpacing: 0.3,
    },
    mallCell: { flex: 1, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
    loadMoreText: {
      textAlign: "center",
      color: colors.textMuted,
      paddingVertical: spacing.lg,
      fontSize: typography.caption,
      width: "100%",
    },
  });
}
