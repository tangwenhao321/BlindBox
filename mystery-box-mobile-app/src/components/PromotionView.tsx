import { useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { useReferralStats, type ReferralStatsHook } from "../hooks/useReferralStats";
import { parseError } from "../api";
import {
  fetchReferralMilestones,
  queryCommissionRecords,
  type CommissionRecord,
  type ReferralMilestones,
} from "../services/referralService";
import { fetchDrawFeed } from "../services/drawFeedService";
import { shareInviteLink } from "../utils/shareInvite";
import { formatCurrency } from "../utils/formatCurrency";
import { SharePosterModal } from "./SharePosterModal";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { EmptyState } from "./EmptyState";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import { isRemoteFeatureEnabled } from "../hooks/useFeatureFlag";

type Props = {
  onBack: () => void;
  embedded?: boolean;
  referral?: ReferralStatsHook;
  onRequireLogin?: () => void;
};

export function PromotionView({ onBack, embedded, referral, onRequireLogin }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const publicConfig = useAppPublicConfig();
  const showMilestones = isRemoteFeatureEnabled("mobile.referral.milestones", publicConfig.featureFlags);
  const styles = useThemedStyles(buildPromotionViewStyles);
  const internalReferral = useReferralStats(token);
  const { stats, loading: statsLoading, loadError: statsError, refresh: refreshStats } = referral ?? internalReferral;
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [posterVisible, setPosterVisible] = useState(false);
  const [feedSnippet, setFeedSnippet] = useState("");
  const [milestones, setMilestones] = useState<ReferralMilestones | null>(null);
  const [extrasError, setExtrasError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();

  const reload = async () => {
    await runLoad(async () => {
      const list = await queryCommissionRecords(token);
      setRecords(list);
      const extrasErrors: string[] = [];
      if (showMilestones) {
        try {
          setMilestones(await fetchReferralMilestones(token));
        } catch (error) {
          setMilestones(null);
          extrasErrors.push(t("promotion.extrasMilestone", { message: parseError(error) }));
        }
      } else {
        setMilestones(null);
      }
      try {
        const feed = await fetchDrawFeed(token, null, 1);
        if (feed[0]) {
          setFeedSnippet(t("promotion.feedSnippet", { name: feed[0].displayName, product: feed[0].productName }));
        } else {
          setFeedSnippet("");
        }
      } catch (error) {
        setFeedSnippet("");
        extrasErrors.push(t("promotion.extrasFeed", { message: parseError(error) }));
      }
      setExtrasError(extrasErrors.length ? extrasErrors.join(" · ") : null);
    });
  };

  useEffect(() => {
    void reload();
  }, [token]);

  const invite = async () => {
    if (!stats?.inviteCode) return;
    const extra = feedSnippet ? `\n${feedSnippet}` : "";
    await shareInviteLink(stats.inviteCode, extra);
  };

  return (
    <View style={styles.root}>
      {embedded ? null : <SubPageHeader title={t("promotion.title")} onBack={onBack} />}
      <ScreenScaffold
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void reload().finally(() => setRefreshing(false));
            }}
            tintColor={colors.brand}
          />
        }
      >
        {statsError && !embedded ? (
          <ListErrorBanner message={statsError} onRetry={() => void refreshStats()} />
        ) : null}
        {extrasError ? (
          <ListErrorBanner message={extrasError} onRetry={() => void reload()} />
        ) : null}
        {shouldShowListSkeleton(statsLoading, stats ? 1 : 0, statsError) ? (
          <ListSkeleton variant="row" rows={1} />
        ) : (
          <View style={styles.hero}>
            <View>
              <Text style={styles.heroLabel}>{t("promotion.invitees")}</Text>
              <Text style={styles.heroValue}>{stats?.invitedCount ?? 0}</Text>
              {stats?.inviteCode ? (
                <Text style={styles.code}>{t("promotion.inviteCode", { code: stats.inviteCode })}</Text>
              ) : null}
            </View>
            <View style={styles.heroRight}>
              <Pressable
                style={styles.inviteBtn}
                onPress={invite}
                accessibilityRole="button"
                accessibilityLabel={t("promotion.shareInvite")}
              >
                <Text style={styles.inviteBtnText}>{t("promotion.shareInvite")}</Text>
              </Pressable>
              <Pressable
                style={styles.posterBtn}
                onPress={() => setPosterVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t("promotion.sharePoster")}
              >
                <Text style={styles.posterBtnText}>{t("promotion.sharePoster")}</Text>
              </Pressable>
            </View>
          </View>
        )}
        {showMilestones && milestones?.tiers?.length ? (
          <View style={styles.milestones}>
            <Text style={styles.milestonesTitle}>{t("promotion.milestonesTitle")}</Text>
            <Text style={styles.milestonesHint}>{t("promotion.milestonesHint")}</Text>
            {milestones.tiers.map((tier) => (
              <View key={tier.targetCount} style={styles.milestoneRow}>
                <Text style={styles.milestoneLabel}>{tier.label}</Text>
                <View style={styles.milestoneTrack}>
                  <View
                    style={[
                      styles.milestoneFill,
                      {
                        width: `${Math.min(100, (milestones.invitedCount / tier.targetCount) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.milestoneMeta}>
                  {tier.claimed
                    ? t("promotion.milestoneClaimed", { coins: tier.rewardCoins ?? 0 })
                    : tier.reached
                      ? t("promotion.milestonePendingClaim")
                      : t("promotion.progress", { current: milestones.invitedCount, target: tier.targetCount })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
        <View style={styles.tableHead}>
          <Text style={styles.col}>{t("promotion.colSource")}</Text>
          <Text style={styles.col}>{t("promotion.colCommission")}</Text>
          <Text style={styles.col}>{t("promotion.colTime")}</Text>
        </View>
        {shouldShowListSkeleton(loading, records.length, loadError, refreshing) ? (
          <ListSkeleton variant="row" rows={5} />
        ) : (
        <OptimizedFlatList
          listVariant="row"
          data={records}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={token ? t("promotion.emptyTitle") : t("promotion.guestEmptyTitle")}
              description={token ? t("promotion.emptyDesc") : t("promotion.guestEmptyDesc")}
              variant="plain"
              actionLabel={!token && onRequireLogin ? t("promotion.goLogin") : undefined}
              onAction={!token ? onRequireLogin : undefined}
            />,
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.col}>{item.sourceUser?.nickname || item.sourceUser?.phone || "—"}</Text>
              <Text style={styles.col}>{formatCurrency(Number(item.amount ?? 0))}</Text>
              <Text style={styles.col}>{item.createdTime?.slice(0, 10) || "—"}</Text>
            </View>
          )}
        />
        )}
      </ScreenScaffold>
      <SharePosterModal
        visible={posterVisible}
        boxName={t("promotion.posterBoxName")}
        orderId={stats?.inviteCode || "invite"}
        drawCount={1}
        topPrizeName={feedSnippet || undefined}
        authToken={token}
        includeLatestFeed
        inviteCode={stats?.inviteCode}
        enableSpectatorLink={false}
        onClose={() => setPosterVisible(false)}
      />
    </View>
  );
}

function buildPromotionViewStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPage },
  content: { gap: spacing.md },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
  },
  heroLabel: { fontSize: typography.caption, color: colors.textSecondary },
  heroValue: { fontSize: typography.h2, fontWeight: "800", color: colors.textPrimary },
  code: { marginTop: 4, color: colors.brand, fontWeight: "700", fontSize: typography.caption },
  heroRight: { gap: spacing.sm, alignItems: "flex-end" },
  inviteBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  inviteBtnText: { color: colors.textOnBrand, fontWeight: "800" },
  posterBtn: {
    borderWidth: 1,
    borderColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  posterBtnText: { color: colors.brand, fontWeight: "800" },
  milestones: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  milestonesTitle: { fontWeight: "800", color: colors.textPrimary },
  milestonesHint: { fontSize: typography.caption, color: colors.textSecondary, lineHeight: 18 },
  milestoneRow: { gap: 4 },
  milestoneLabel: { fontWeight: "700", color: colors.textPrimary, fontSize: typography.caption },
  milestoneTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  milestoneFill: { height: "100%", backgroundColor: colors.brand },
  milestoneMeta: { fontSize: typography.caption, color: colors.textSecondary },
  tableHead: { flexDirection: "row", paddingVertical: spacing.sm },
  col: { flex: 1, fontWeight: "700", fontSize: typography.caption },
  row: { flexDirection: "row", paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  });
}
