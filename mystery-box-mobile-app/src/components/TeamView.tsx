import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useReferralStats, type ReferralStatsHook } from "../hooks/useReferralStats";
import { getTeamMembers, type TeamMember } from "../services/referralService";
import { shareInviteLink } from "../utils/shareInvite";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing, typography } from "../styles/tokens";

type Props = {
  onBack: () => void;
  embedded?: boolean;
  referral?: ReferralStatsHook;
  onInvite?: () => void;
  onOpenTeamLottery?: () => void;
};

export function TeamView({ onBack, embedded, referral, onInvite, onOpenTeamLottery }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const internalReferral = useReferralStats(token);
  const { stats, loading: statsLoading, loadError: statsError, refresh: refreshStats } = referral ?? internalReferral;
  const [level, setLevel] = useState<1 | 2>(1);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();

  const styles = useThemedStyles((colors) => ({
    root: { flex: 1, backgroundColor: colors.bgPage },
    inviteLink: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    summary: { padding: spacing.md, gap: 4 },
    summaryText: { color: colors.textSecondary, fontSize: typography.body },
    tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    tab: { flex: 1, alignItems: "center", paddingVertical: spacing.md },
    tabText: { fontWeight: "700", color: colors.textMuted },
    tabTextActive: { color: colors.brand },
    indicator: { marginTop: spacing.xs, height: 2, width: 32, backgroundColor: colors.brand, borderRadius: 1 },
    list: { padding: spacing.md, gap: spacing.sm },
    row: {
      padding: spacing.md,
      backgroundColor: colors.bgCard,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    name: { fontWeight: "700", color: colors.textPrimary },
    meta: { marginTop: 4, color: colors.textMuted, fontSize: typography.caption },
  }));

  const reload = useCallback(async () => {
    await runLoad(async () => {
      setMembers(await getTeamMembers(token, level));
    });
  }, [token, level, runLoad]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (loadError) setMembers([]);
  }, [loadError]);

  const memberCount = (stats?.invitedCount ?? 0) + (stats?.level2Count ?? 0);
  const inviteCode = stats?.inviteCode ?? "";

  return (
    <View style={styles.root}>
      {embedded ? null : (
        <SubPageHeader
          title={t("team.title")}
          onBack={onBack}
          rightSlot={
            <Pressable
              onPress={() => inviteCode && shareInviteLink(inviteCode)}
              accessibilityRole="button"
              accessibilityLabel={t("team.inviteFriend")}
            >
              <Text style={styles.inviteLink}>{t("team.inviteFriend")}</Text>
            </Pressable>
          }
        />
      )}
      {!embedded && statsError ? (
        <ListErrorBanner message={statsError} onRetry={() => void refreshStats()} />
      ) : null}
      {statsLoading && !stats && !statsError ? (
        <ListSkeleton variant="row" rows={1} />
      ) : (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{t("team.memberCount", { count: memberCount })}</Text>
          <Text style={styles.summaryText}>{t("team.inviteCode", { code: inviteCode || "—" })}</Text>
          {onOpenTeamLottery ? (
            <Pressable onPress={onOpenTeamLottery} accessibilityRole="button" accessibilityLabel={t("teamLottery.title")}>
              <Text style={styles.inviteLink}>{t("teamLottery.title")} →</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <View style={styles.tabs}>
        <Pressable
          style={styles.tab}
          onPress={() => setLevel(1)}
          accessibilityRole="button"
          accessibilityState={{ selected: level === 1 }}
          accessibilityLabel={t("team.level1")}
        >
          <Text style={[styles.tabText, level === 1 ? styles.tabTextActive : null]}>{t("team.level1")}</Text>
          {level === 1 ? <View style={styles.indicator} /> : null}
        </Pressable>
        <Pressable
          style={styles.tab}
          onPress={() => setLevel(2)}
          accessibilityRole="button"
          accessibilityState={{ selected: level === 2 }}
          accessibilityLabel={t("team.level2")}
        >
          <Text style={[styles.tabText, level === 2 ? styles.tabTextActive : null]}>{t("team.level2")}</Text>
          {level === 2 ? <View style={styles.indicator} /> : null}
        </Pressable>
      </View>
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {shouldShowListSkeleton(loading, members.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={6} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          data={members}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void reload().finally(() => setRefreshing(false));
              }}
            />
          }
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState title={t("team.emptyTitle")} description={t("team.emptyDesc")} variant="plain" />,
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.nickname || item.phone || "—"}</Text>
              {item.joinedAt ? <Text style={styles.meta}>{item.joinedAt}</Text> : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
