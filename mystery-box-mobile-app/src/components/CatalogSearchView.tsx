import { useCallback, useEffect, useMemo, useState } from "react";

import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useTranslation } from "react-i18next";

import { SubPageHeader } from "./ui/SubPageHeader";

import { MallProductCard } from "./mall/MallProductCard";

import { EmptyState } from "./EmptyState";

import { ListErrorBanner } from "./ui/ListErrorBanner";

import { ListFooterLoading } from "./ui/ListFooterLoading";

import { OptimizedFlatList } from "./ui/OptimizedFlatList";

import { useThemedStyles } from "../hooks/useThemedStyles";

import { useAppTheme } from "../context/ThemeContext";

import { layout, radius, spacing, typography } from "../styles/tokens";

import type { ThemeColors } from "../styles/themes";

import type { MysteryBox } from "../types";

import { parseError } from "../api";

import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";

import { trackEvent } from "../utils/analytics";

import { addSearchHistory, clearSearchHistory, loadSearchHistory } from "../utils/searchHistoryStorage";

import { listEmptyWhenOk } from "./ui/listScreenHelpers";

import { useHotKeywordsQuery } from "../query/hooks/useHotKeywordsQuery";
import { useAuthToken } from "../hooks/useAuthToken";
import { useCatalogSearchInfiniteQuery } from "../query/hooks/useCatalogSearchInfiniteQuery";
import { flattenBoxPages } from "../query/flattenInfinitePages";
import { buildCatalogHotKeywords } from "./catalogSearchHelpers";

type Props = {
  initialKeyword?: string;
  onBack: () => void;
  onOpenBox: (boxId: string) => void;
  onMallSearchCommit?: (keyword: string) => void;
};

export function CatalogSearchView({
  initialKeyword = "",
  onBack,
  onOpenBox,
  onMallSearchCommit,
}: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildCatalogSearchStyles);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [activeKeyword, setActiveKeyword] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hotKeywordsQuery = useHotKeywordsQuery();
  const searchQuery = useCatalogSearchInfiniteQuery(token, activeKeyword, !!activeKeyword);

  const hotKeywords = useMemo(
    () => buildCatalogHotKeywords(t, hotKeywordsQuery.data),
    [hotKeywordsQuery.data, t],
  );

  const items = useMemo(() => flattenBoxPages(searchQuery.data), [searchQuery.data]);
  const hasMore = useMemo(() => {
    const pages = searchQuery.data?.pages;
    if (!pages?.length) return false;
    return pages[pages.length - 1]?.hasMore ?? false;
  }, [searchQuery.data]);
  const loading = searchQuery.isFetching && !searchQuery.data;
  const loadingMore = searchQuery.isFetchingNextPage;

  useEffect(() => {
    void loadSearchHistory().then(setHistory);
  }, []);

  useEffect(() => {
    if (searchQuery.error) {
      setLoadError(parseError(searchQuery.error));
    } else if (searchQuery.isSuccess) {
      setLoadError(null);
    }
  }, [searchQuery.error, searchQuery.isSuccess]);

  const runSearch = useCallback(
    async (raw?: string) => {
      const q = (raw ?? keyword).trim();
      setKeyword(q);
      if (!q) {
        setLoadError(t("catalogSearch.keywordRequired"));
        return;
      }
      setLoadError(null);
      setActiveKeyword(q);
      trackEvent(ANALYTICS_EVENTS.SEARCH_SUBMIT, { keyword: q, mode: "inline" });
      const nextHistory = await addSearchHistory(q);
      setHistory(nextHistory);
    },
    [keyword, t],
  );

  useEffect(() => {
    if (!activeKeyword || !searchQuery.isSuccess) return;
    const firstPage = searchQuery.data?.pages[0];
    if (firstPage) {
      trackEvent(ANALYTICS_EVENTS.SEARCH_RESULT, {
        keyword: activeKeyword,
        count: firstPage.items.length,
        mode: "inline",
      });
    }
  }, [activeKeyword, searchQuery.data, searchQuery.isSuccess]);

  useEffect(() => {
    const q = initialKeyword.trim();
    if (!q) return;
    void runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword]);

  const showDiscovery = !activeKeyword && !loading;

  const retrySearch = useCallback(() => {
    void searchQuery.refetch();
  }, [searchQuery]);

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("catalogSearch.title")} onBack={onBack} />
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons
            name="search-outline"
            size={16}
            color={themeColors.textMuted}
            style={styles.searchIcon}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <TextInput
            testID="catalogSearchInput"
            value={keyword}
            onChangeText={(text) => {
              setKeyword(text);
              if (!text.trim()) {
                setActiveKeyword("");
                setLoadError(null);
              } else if (loadError) {
                setLoadError(null);
              }
            }}
            placeholder={t("catalogSearch.placeholder")}
            placeholderTextColor={themeColors.textPlaceholder}
            style={styles.searchInput}
            returnKeyType="search"
            autoFocus={!initialKeyword}
            accessibilityLabel={t("catalogSearch.placeholder")}
            onSubmitEditing={() => void runSearch()}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("catalogSearch.searchBtn")}
          onPress={() => void runSearch()}
          disabled={loading}
          style={({ pressed }) => [styles.searchBtn, pressed ? styles.pressed : null, loading ? styles.disabled : null]}
        >
          {loading && !items.length ? (
            <ActivityIndicator color={themeColors.textOnBrand} size="small" />
          ) : (
            <Text style={styles.searchBtnText}>{t("catalogSearch.searchBtn")}</Text>
          )}
        </Pressable>
      </View>

      {loadError ? <ListErrorBanner message={loadError} onRetry={retrySearch} /> : null}

      {showDiscovery ? (
        <View style={styles.discovery}>
          {history.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{t("catalogSearch.historyTitle")}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("catalogSearch.clearHistory")}
                  onPress={() => void clearSearchHistory().then(() => setHistory([]))}
                >
                  <Text style={styles.link}>{t("catalogSearch.clearHistory")}</Text>
                </Pressable>
              </View>
              <View style={styles.chipRow}>
                {history.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={item}
                    style={styles.chip}
                    onPress={() => {
                      trackEvent(ANALYTICS_EVENTS.SEARCH_HISTORY_CLICK, { keyword: item, source: "history" });
                      void runSearch(item);
                    }}
                  >
                    <Text style={styles.chipText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("catalogSearch.hotTitle")}</Text>
            <View style={styles.chipRow}>
              {hotKeywords.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                  style={styles.chip}
                  onPress={() => {
                    trackEvent(ANALYTICS_EVENTS.SEARCH_HISTORY_CLICK, { keyword: item, source: "hot" });
                    void runSearch(item);
                  }}
                >
                  <Text style={styles.chipText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {activeKeyword ? (
        <OptimizedFlatList
          listVariant="card"
          data={items}
          keyExtractor={(item: MysteryBox) => item.id}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          onEndReached={() => {
            if (!loadingMore && hasMore && activeKeyword) void searchQuery.fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={styles.resultHead}>
              <Text style={styles.resultCount}>
                {t("catalogSearch.resultCount", { count: items.length, keyword: activeKeyword })}
              </Text>
              {onMallSearchCommit ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("catalogSearch.openInMall")}
                  onPress={() => onMallSearchCommit(activeKeyword)}
                >
                  <Text style={styles.link}>{t("catalogSearch.openInMall")}</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={loadingMore ? <ListFooterLoading /> : null}
          ListEmptyComponent={
            loading
              ? null
              : listEmptyWhenOk(
                  loadError,
                  <EmptyState
                    title={t("catalogSearch.emptyTitle")}
                    description={t("catalogSearch.emptyDesc")}
                    actionLabel={t("catalogSearch.goHome")}
                    onAction={onBack}
                    variant="plain"
                  />,
                )
          }
          renderItem={({ item, index }) => (
            <View style={styles.cell}>
              <MallProductCard item={item} index={index} onPress={onOpenBox} />
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

function buildCatalogSearchStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: layout.screenPaddingX,
      paddingBottom: spacing.md,
    },
    searchInputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: { marginEnd: spacing.xs },
    searchInput: { flex: 1, fontSize: typography.body, color: colors.textPrimary, paddingVertical: spacing.sm },
    searchBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    searchBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
    disabled: { opacity: 0.6 },
    pressed: { opacity: 0.9 },
    discovery: { paddingHorizontal: layout.screenPaddingX, gap: spacing.lg },
    section: { gap: spacing.sm },
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionTitle: { fontSize: typography.caption, fontWeight: "800", color: colors.textSecondary },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: { fontSize: typography.caption, color: colors.textPrimary, fontWeight: "600" },
    link: { fontSize: typography.caption, color: colors.brand, fontWeight: "700" },
    listContent: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.xxl },
    cell: { flex: 1, marginBottom: spacing.md, paddingHorizontal: spacing.xs },
    resultHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
      gap: spacing.sm,
      width: "100%",
    },
    resultCount: { flex: 1, fontSize: typography.caption, color: colors.textMuted, fontWeight: "600" },
  });
}
