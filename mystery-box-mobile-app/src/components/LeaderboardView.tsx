import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuthToken } from "../hooks/useAuthToken";
import { ListFooterLoading } from "./ui/ListFooterLoading";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { fetchLeaderboardMe, fetchLeaderboardPage, type LeaderboardEntry, type LeaderboardMe } from "../services/leaderboardService";
import { parseError } from "../api";

type Props = {
  mysteryBoxId?: string;
  onBack: () => void;
};

export function LeaderboardView({ mysteryBoxId, onBack }: Props) {
  const { t } = useTranslation();
  const token = useAuthToken();
  const styles = useThemedStyles(buildLeaderboardStyles);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<LeaderboardMe | null>(null);

  const loadMyRank = useCallback(async () => {
    if (!token) {
      setMyRank(null);
      return;
    }
    const me = await fetchLeaderboardMe(token, mysteryBoxId);
    setMyRank(me);
  }, [mysteryBoxId, token]);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const result = await fetchLeaderboardPage(mysteryBoxId, period, pageNum, 20);
      setEntries((prev) => (append ? [...prev, ...result.items] : result.items));
      setPage(result.page);
      setHasMore(result.hasMore);
    },
    [mysteryBoxId, period],
  );

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    void Promise.all([loadPage(0, false), loadMyRank()])
      .catch((e) => {
        setEntries([]);
        setHasMore(false);
        setLoadError(parseError(e));
      })
      .finally(() => setLoading(false));
  }, [loadPage, loadMyRank]);

  const loadMore = () => {
    if (!hasMore || loadingMore || loadError) return;
    setLoadingMore(true);
    void loadPage(page + 1, true)
      .catch((e) => setLoadError(parseError(e)))
      .finally(() => setLoadingMore(false));
  };

  return (
    <View style={styles.page}>
      <SubPageHeader title={t("leaderboard.title")} onBack={onBack} />
      <View style={styles.tabs}>
        {(["week", "month"] as const).map((key) => (
          <Pressable
            key={key}
            style={[styles.tab, period === key ? styles.tabOn : null]}
            onPress={() => setPeriod(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: period === key }}
            accessibilityLabel={key === "week" ? t("leaderboard.tabWeek") : t("leaderboard.tabMonth")}
          >
            <Text style={[styles.tabText, period === key ? styles.tabTextOn : null]}>
              {key === "week" ? t("leaderboard.tabWeek") : t("leaderboard.tabMonth")}
            </Text>
          </Pressable>
        ))}
      </View>
      {myRank && token ? (
        <View style={styles.myRankCard} accessibilityRole="summary">
          <Text style={styles.myRankLabel}>{t("leaderboard.myRank")}</Text>
          <Text style={styles.myRankValue}>
            {myRank.onBoard ? t("leaderboard.rankNo", { rank: myRank.rank }) : t("leaderboard.notRanked")}
          </Text>
          <Text style={styles.myRankMeta}>
            {t("leaderboard.highCount", { count: myRank.highCount })}
            {myRank.title ? ` · ${myRank.title}` : ""}
          </Text>
        </View>
      ) : null}
      {loadError ? (
        <ListErrorBanner
          message={loadError}
          onRetry={() => {
            setLoading(true);
            void Promise.all([loadPage(0, false), loadMyRank()])
              .catch((e) => setLoadError(parseError(e)))
              .finally(() => setLoading(false));
          }}
        />
      ) : null}
      {shouldShowListSkeleton(loading, entries.length, loadError) ? (
        <ListSkeleton variant="row" rows={8} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          data={entries}
          keyExtractor={(item) => `${period}-${item.nickname}`}
          contentContainerStyle={styles.content}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ListFooterLoading /> : null}
          ListEmptyComponent={
            loading
              ? null
              : listEmptyWhenOk(
                  loadError,
                  <EmptyState
                    title={t("leaderboard.emptyTitle")}
                    description={t("leaderboard.emptyDesc")}
                    variant="plain"
                  />,
                )
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rank}>{t("leaderboard.rankNo", { rank: item.rank })}</Text>
              <Text style={styles.name}>{item.nickname}</Text>
              <Text style={styles.count}>{t("leaderboard.highCount", { count: item.highCount })}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function buildLeaderboardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.bgPage },
    tabs: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.sm },
    tab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      backgroundColor: colors.bgCard,
    },
    tabOn: { backgroundColor: colors.brand },
    tabText: { fontWeight: "700", color: colors.textSecondary },
    tabTextOn: { color: colors.textOnBrand },
    myRankCard: {
      marginHorizontal: layout.screenPaddingX,
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgBrandSoft,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    myRankLabel: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: "700" },
    myRankValue: { fontSize: typography.h2, fontWeight: "900", color: colors.brand, marginTop: spacing.xs },
    myRankMeta: { marginTop: spacing.xs, fontSize: typography.caption, color: colors.textPrimary },
    content: { padding: layout.screenPaddingX, paddingBottom: spacing.xxl },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    rank: { minWidth: 52, fontWeight: "900", color: colors.brand, fontSize: typography.caption },
    name: { flex: 1, fontWeight: "700", color: colors.textPrimary },
    count: { color: colors.textSecondary, fontSize: typography.caption },
  });
}
