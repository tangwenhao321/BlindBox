import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAuthToken } from "../hooks/useAuthToken";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import type { OptimizedListRef } from "./ui/OptimizedFlatList";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { useListLoad } from "../hooks/useListLoad";
import {
  cancelWarehouseShipRequest,
  fetchMyWarehouseShipRequests,
  type ShipRequestSummary,
} from "../services/warehouseShipService";
import { fetchWarehouseShipTracking, type TrackingEvent } from "../services/logisticsService";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { queueIfOffline } from "../utils/offlineSubmitGuard";
import { consumePendingShipRequestId } from "../utils/deepLinkParams";
import { formatCurrency } from "../utils/formatCurrency";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  onBack: () => void;
  onGoWarehouse?: () => void;
};

export function ShipRequestsView({ onBack, onGoWarehouse }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildShipRequestsStyles);
  const { confirm } = useConfirmDialog();
  const [rows, setRows] = useState<ShipRequestSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, TrackingEvent[]>>({});
  const { loadError, loading, runLoad } = useListLoad();
  const listRef = useRef<OptimizedListRef<ShipRequestSummary>>(null);

  const statusLabel = (status: string) => {
    if (status === "PENDING") return t("ship.statusPending");
    if (status === "SHIPPED") return t("ship.statusShipped");
    if (status === "CANCELLED") return t("ship.statusCancelled");
    if (status === "REJECTED") return t("ship.statusRejected");
    return status;
  };

  const reload = useCallback(
    async (pull = false) => {
      if (pull) setRefreshing(true);
      await runLoad(async () => {
        setRows(await fetchMyWarehouseShipRequests(authToken, 50));
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

  useEffect(() => {
    const pending = consumePendingShipRequestId();
    if (pending) setHighlightId(pending);
  }, []);

  const toggleTracking = useCallback(
    async (row: ShipRequestSummary) => {
      if (expandedId === row.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(row.id);
      if (!tracking[row.id] && row.trackingNumber) {
        try {
          const result = await fetchWarehouseShipTracking(authToken, row.id);
          setTracking((prev) => ({ ...prev, [row.id]: result.events ?? [] }));
        } catch (error) {
          toast.error(parseError(error));
        }
      }
    },
    [authToken, expandedId, tracking],
  );

  useEffect(() => {
    if (!highlightId || !rows.length) return;
    const index = rows.findIndex((row) => row.id === highlightId);
    if (index < 0) return;
    const row = rows[index];
    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index, animated: true });
      } catch {
        listRef.current?.scrollToOffset({ offset: index * 140, animated: true });
      }
      void toggleTracking(row);
    }, 300);
    const clearHighlight = setTimeout(() => setHighlightId(null), 4000);
    return () => {
      clearTimeout(timer);
      clearTimeout(clearHighlight);
    };
  }, [highlightId, rows, toggleTracking]);

  const handleCancel = async (row: ShipRequestSummary) => {
    const ok = await confirm({
      title: t("ship.cancelTitle"),
      message: t("ship.cancelMessage"),
      confirmLabel: t("ship.cancelConfirm"),
      cancelLabel: t("ship.cancelKeep"),
      destructive: true,
    });
    if (!ok) return;
    const perform = async () => {
      try {
        await cancelWarehouseShipRequest(authToken, row.id);
        toast.success(t("ship.cancelSuccess"));
        void reload();
      } catch (error) {
        toast.error(parseError(error));
      }
    };
    if (
      queueIfOffline(t("offline.actionCancelShip"), perform, {
        kind: "warehouseShipCancel",
        token: authToken,
        payload: { requestId: row.id },
      })
    )
      return;
    await perform();
  };

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("ship.title")} onBack={onBack} />
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {shouldShowListSkeleton(loading, rows.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={5} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void reload(true)} tintColor={colors.brand} />
          }
          renderItem={({ item }) => (
            <View style={[styles.card, highlightId === item.id ? styles.cardHighlight : null]}>
              <Text style={styles.title}>
                {t("ship.cardTitle", { count: item.itemCount, amount: formatCurrency(Number(item.payAmount)) })}
              </Text>
              <Text style={styles.meta}>{statusLabel(item.status)}</Text>
              {item.addressSnapshot ? (
                <Text style={styles.addr} numberOfLines={2}>
                  {item.addressSnapshot}
                </Text>
              ) : null}
              {item.rejectReason ? (
                <Text style={styles.reject}>{t("ship.rejectReason", { reason: item.rejectReason })}</Text>
              ) : null}
              {item.trackingNumber ? (
                <>
                  <Text style={styles.track}>{t("ship.trackingNumber", { number: item.trackingNumber })}</Text>
                  <Pressable
                    onPress={() => void toggleTracking(item)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      expandedId === item.id ? t("ship.collapseTracking") : t("ship.expandTracking")
                    }
                  >
                    <Text style={styles.link}>
                      {expandedId === item.id ? t("ship.collapseTracking") : t("ship.expandTracking")}
                    </Text>
                  </Pressable>
                  {expandedId === item.id ? (
                    <View style={styles.timeline}>
                      {(tracking[item.id] ?? []).length ? (
                        (tracking[item.id] ?? []).map((event, index) => (
                          <Text key={`${event.status}-${index}`} style={styles.timelineStep}>
                            ● {event.description || event.status}
                            {event.eventTime ? ` · ${event.eventTime}` : ""}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.timelineStep}>{t("ship.noTrackingNodes")}</Text>
                      )}
                    </View>
                  ) : null}
                </>
              ) : null}
              {item.status === "PENDING" ? (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t("ship.cancelBtn")}
                >
                  <Text style={styles.cancelText}>{t("ship.cancelBtn")}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={t("ship.emptyTitle")}
              description={t("ship.emptyDesc")}
              variant="plain"
              actionLabel={onGoWarehouse ? t("ship.goWarehouse") : undefined}
              onAction={onGoWarehouse}
            />,
          )}
        />
      )}
    </View>
  );
}

function buildShipRequestsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    list: { padding: layout.screenPaddingX, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    cardHighlight: {
      borderColor: colors.brand,
      borderWidth: 1.5,
      backgroundColor: colors.bgBrandSoft,
    },
    title: { fontWeight: "800", color: colors.textPrimary },
    meta: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    addr: { color: colors.textSecondary, fontSize: typography.caption },
    reject: { color: colors.danger, fontSize: typography.caption },
    track: { color: colors.textPrimary, fontSize: typography.caption, fontWeight: "700" },
    link: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    timeline: { marginTop: spacing.xs, gap: 4, paddingLeft: spacing.xs },
    timelineStep: { color: colors.textSecondary, fontSize: typography.micro },
    cancelBtn: { alignSelf: "flex-start", marginTop: spacing.xs },
    cancelText: { color: colors.danger, fontWeight: "700", fontSize: typography.caption },
  });
}
