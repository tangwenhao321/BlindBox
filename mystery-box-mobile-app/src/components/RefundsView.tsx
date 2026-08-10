import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../utils/formatCurrency";
import { formatOrderIdShort } from "../order-utils";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAuthToken } from "../hooks/useAuthToken";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useListLoad } from "../hooks/useListLoad";
import {
  fetchRefundTimeline,
  queryMyRefunds,
  type RefundRecord,
} from "../services/refundService";
import { layout, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  onBack: () => void;
  onOpenOrder: (orderId: string) => void;
  onGoOrders?: () => void;
};

function statusLabel(
  t: (key: string) => string,
  status?: { keyEnName?: string; keyName?: string },
) {
  const key = status?.keyEnName || status?.keyName || "";
  if (key === "SUCCESS") return t("refunds.statusSuccess");
  if (key === "FAILED") return t("refunds.statusFailed");
  if (key === "REFUNDING") return t("refunds.statusPending");
  return key || "—";
}

export function RefundsView({ onBack, onOpenOrder, onGoOrders }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildRefundsViewStyles);
  const [rows, setRows] = useState<RefundRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, { step: string; label: string; at?: string }[]>>({});
  const { loadError, loading, runLoad } = useListLoad();

  const reload = useCallback(
    async (pull = false) => {
      if (pull) setRefreshing(true);
      await runLoad(async () => {
        setRows(await queryMyRefunds(authToken));
      });
      if (pull) setRefreshing(false);
    },
    [authToken, runLoad],
  );

  useEffect(() => {
    if (loadError) setRows([]);
  }, [loadError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleTimeline = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!timeline[id]) {
      const events = await fetchRefundTimeline(authToken, id);
      setTimeline((prev) => ({ ...prev, [id]: events }));
    }
  };

  return (
    <View style={styles.page}>
      <SubPageHeader title={t("refunds.title")} onBack={onBack} />
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {shouldShowListSkeleton(loading, rows.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={5} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor={colors.brand} />
          }
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={t("refunds.emptyTitle")}
              description={t("refunds.emptyDesc")}
              variant="plain"
              actionLabel={onGoOrders ? t("refunds.goOrders") : undefined}
              onAction={onGoOrders}
            />,
          )}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.order}>{t("refunds.orderLabel", { id: formatOrderIdShort(item.orderId) })}</Text>
              <Text style={styles.reason}>{item.reason}</Text>
              <Text style={styles.meta}>
                {formatCurrency(item.amount)} · {statusLabel(t, item.status)}
              </Text>
              <Pressable
                onPress={() => void toggleTimeline(item.id)}
                accessibilityRole="button"
                accessibilityLabel={expandedId === item.id ? t("refunds.collapseTimeline") : t("refunds.expandTimeline")}
              >
                <Text style={styles.link}>{expandedId === item.id ? "▴" : "▾"}</Text>
              </Pressable>
              {expandedId === item.id ? (
                <View style={styles.timeline}>
                  {(timeline[item.id] ?? []).map((step, index) => (
                    <Text key={`${step.step}-${index}`} style={styles.timelineStep}>
                      ● {step.label}
                      {step.at ? ` · ${step.at}` : ""}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={styles.link} onPress={() => onOpenOrder(item.orderId)}>
                {t("refunds.viewOrder")}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function buildRefundsViewStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.bgPage },
    list: { padding: layout.screenPaddingX, gap: spacing.md, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 12,
      padding: spacing.md,
      gap: spacing.xs,
    },
    order: { fontWeight: "700", color: colors.textPrimary },
    reason: { color: colors.textSecondary, fontSize: typography.caption },
    meta: { color: colors.brand, fontWeight: "600" },
    link: { color: colors.brand, marginTop: spacing.xs, fontSize: typography.caption },
    timeline: { marginTop: spacing.xs, gap: 4, paddingLeft: spacing.xs },
    timelineStep: { color: colors.textSecondary, fontSize: typography.micro },
  });
}
