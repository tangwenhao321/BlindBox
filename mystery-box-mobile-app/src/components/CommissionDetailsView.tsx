import { useCallback, useEffect, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { queryCommissionRecords, getReferralStats, type CommissionRecord } from "../services/referralService";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, spacing, typography } from "../styles/tokens";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  onBack: () => void;
  embedded?: boolean;
  onGoPromotion?: () => void;
  onRequireLogin?: () => void;
};

export function CommissionDetailsView({ onBack, embedded, onGoPromotion, onRequireLogin }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();

  const styles = useThemedStyles((colors) => ({
    root: { flex: 1, backgroundColor: colors.bgPage },
    banner: {
      margin: spacing.md,
      padding: spacing.lg,
      borderRadius: 12,
      backgroundColor: colors.brand,
      overflow: "hidden",
    },
    watermark: {
      position: "absolute",
      right: spacing.md,
      top: spacing.sm,
      fontSize: typography.h2,
      fontWeight: "900",
      color: "rgba(255,255,255,0.15)",
    },
    bannerLabel: { color: "rgba(255,255,255,0.85)", fontSize: typography.caption },
    bannerValue: { color: colors.textOnBrand, fontSize: typography.h1, fontWeight: "900", marginTop: 4 },
    sectionTitle: {
      paddingHorizontal: layout.screenPaddingX,
      fontWeight: "800",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    sectionHint: { fontWeight: "400", color: colors.textMuted, fontSize: typography.caption },
    list: { paddingHorizontal: layout.screenPaddingX, paddingBottom: layout.screenPaddingBottom },
    item: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    itemTitle: { fontWeight: "700", color: colors.textPrimary },
    itemAmount: { color: colors.success, fontWeight: "800", marginTop: 4 },
    itemMeta: { marginTop: 4, color: colors.textMuted, fontSize: typography.caption },
  }));

  const reload = useCallback(async () => {
    await runLoad(async () => {
      const [stats, list] = await Promise.all([getReferralStats(token), queryCommissionRecords(token)]);
      setTotal(Number(stats.totalCommission ?? 0));
      setRecords(list);
    });
  }, [token, runLoad]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      {embedded ? null : <SubPageHeader title={t("commission.title")} onBack={onBack} />}
      {shouldShowListSkeleton(loading, 1, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={1} />
      ) : (
        <View style={styles.banner}>
          <Text style={styles.watermark}>BLIND BOX</Text>
          <Text style={styles.bannerLabel}>{t("commission.totalLabel")}</Text>
          <Text style={styles.bannerValue}>{formatCurrency(total)}</Text>
        </View>
      )}
      <Text style={styles.sectionTitle}>
        {t("commission.sectionTitle")} <Text style={styles.sectionHint}>{t("commission.sectionHint")}</Text>
      </Text>
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {shouldShowListSkeleton(loading, records.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={6} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemTitle}>{item.remark || t("commission.defaultRemark")}</Text>
              <Text style={styles.itemAmount}>+{formatCurrency(Number(item.amount))}</Text>
              {item.createdTime ? <Text style={styles.itemMeta}>{item.createdTime}</Text> : null}
            </View>
          )}
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={token ? t("commission.emptyTitle") : t("commission.guestEmptyTitle")}
              description={token ? t("commission.emptyDesc") : t("commission.guestEmptyDesc")}
              variant="plain"
              actionLabel={
                !token && onRequireLogin
                  ? t("commission.goLogin")
                  : onGoPromotion
                    ? t("commission.goPromotion")
                    : undefined
              }
              onAction={!token ? onRequireLogin : onGoPromotion}
            />,
          )}
        />
      )}
    </View>
  );
}
