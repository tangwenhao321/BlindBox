import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { parseError } from "../api";
import { useAuthToken } from "../hooks/useAuthToken";
import { useNotificationsQuery } from "../query/hooks/useNotificationsQuery";
import { useMarkNotificationsReadMutation } from "../query/hooks/useMarkNotificationsReadMutation";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { NOTIFICATION_CATEGORIES } from "../config/notificationCategories";
import { buildOrderNotificationEvents } from "../services/orderNotificationService";
import type { Order } from "../types";
import { markNotificationsRead } from "../utils/notificationRead";
import { setPendingShipRequestId } from "../utils/deepLinkParams";
import { SubPageHeader } from "./ui/SubPageHeader";
import { SubPageShelfAccent } from "./ui/SubPageShelfAccent";
import { SectionHeading } from "./ui/SectionHeading";
import { EmptyState } from "./EmptyState";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { shouldShowListSkeleton } from "./ui/listScreenHelpers";

type Tab = "action" | "all" | "system" | "pay" | "ship" | "coupon";
type NotifFilter = "all" | "ORDER" | "REFUND" | "MARKETPLACE" | "WAREHOUSE_SHIP" | "RESTOCK" | "PITY";

const NOTIF_FILTERS: { key: NotifFilter; labelKey: string }[] = [
  { key: "all", labelKey: "messages.filterAll" },
  { key: "ORDER", labelKey: "messages.filterOrder" },
  { key: "REFUND", labelKey: "messages.filterRefund" },
  { key: NOTIFICATION_CATEGORIES.MARKETPLACE, labelKey: "messages.filterMarketplace" },
  { key: NOTIFICATION_CATEGORIES.RESTOCK, labelKey: "messages.filterRestock" },
  { key: NOTIFICATION_CATEGORIES.PITY, labelKey: "messages.filterPity" },
  { key: "WAREHOUSE_SHIP", labelKey: "messages.filterShip" },
];

type Props = {
  recentOrders: Order[];
  couponCount?: number;
  onBack: () => void;
  onOpenOrder: (orderId: string) => void;
  onOpenBox?: (boxId: string) => void;
  onOpenCoupons?: () => void;
  onOpenMarketplace?: () => void;
  onOpenShipRequests?: () => void;
  onOpenPendingOrders?: () => void;
  onGoWarehouse?: () => void;
  onMarkedRead?: (ids: string[]) => void;
  onRefresh?: () => void | Promise<void>;
};

const TABS: { key: Tab; labelKey: string }[] = [
  { key: "action", labelKey: "messages.tabAction" },
  { key: "all", labelKey: "messages.tabAll" },
  { key: "system", labelKey: "messages.tabSystem" },
  { key: "pay", labelKey: "messages.tabPay" },
  { key: "ship", labelKey: "messages.tabShip" },
  { key: "coupon", labelKey: "messages.tabCoupon" },
];

export function MessageCenterView({
  recentOrders,
  couponCount = 0,
  onBack,
  onOpenOrder,
  onOpenBox,
  onOpenCoupons,
  onOpenMarketplace,
  onOpenShipRequests,
  onOpenPendingOrders,
  onGoWarehouse,
  onMarkedRead,
  onRefresh,
}: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const styles = useThemedStyles(buildMessageCenterViewStyles);
  const [tab, setTab] = useState<Tab>("action");
  const [notifFilter, setNotifFilter] = useState<NotifFilter>("all");
  const { data: notificationList = [], isLoading, isFetching, error, refetch } = useNotificationsQuery(authToken, 30);
  const markReadMutation = useMarkNotificationsReadMutation(authToken);
  const serverNotes = useMemo(
    () =>
      notificationList.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        read: n.read,
        category: n.category,
        refId: n.refId,
      })),
    [notificationList],
  );
  const loadError = error ? parseError(error) : null;
  const refreshing = isFetching && !isLoading;
  const initialLoading = isLoading;
  const events = useMemo(() => buildOrderNotificationEvents(recentOrders), [recentOrders]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    await onRefresh?.();
  }, [refetch, onRefresh]);

  const markNoteRead = useCallback(
    (noteId: string) => {
      if (!authToken) return;
      const note = serverNotes.find((n) => n.id === noteId);
      if (!note || note.read) return;
      void markReadMutation.mutateAsync([noteId]).then(() => onMarkedRead?.([noteId]));
    },
    [authToken, markReadMutation, onMarkedRead, serverNotes],
  );

  const handleBack = () => {
    if (authToken) {
      const unreadIds = serverNotes.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        void markReadMutation.mutateAsync(unreadIds).then(() => onMarkedRead?.(unreadIds));
      }
    }
    onBack();
  };

  useEffect(() => {
    const ids = events.map((e) => e.orderId);
    if (!ids.length) return;
    void markNotificationsRead(ids).then(() => onMarkedRead?.(ids));
  }, [events, onMarkedRead]);

  const payEvents = useMemo(() => events.filter((e) => e.type === "pay"), [events]);
  const shipEvents = useMemo(
    () => events.filter((e) => e.type === "ship" || e.type === "receive" || e.type === "shipped"),
    [events],
  );
  const unreadNotes = useMemo(() => serverNotes.filter((n) => !n.read), [serverNotes]);
  const actionCount = payEvents.length + shipEvents.length + unreadNotes.length;

  const filteredEvents = useMemo(() => {
    if (tab === "action") return [...payEvents, ...shipEvents];
    if (tab === "pay") return payEvents;
    if (tab === "ship") return shipEvents;
    if (tab === "system") return [];
    return events;
  }, [events, payEvents, shipEvents, tab]);

  const systemNotes = useMemo(() => {
    if (tab !== "all" && tab !== "system") return [];
    if (notifFilter === "all") return serverNotes;
    return serverNotes.filter((n) => n.category === notifFilter);
  }, [serverNotes, tab, notifFilter]);

  const showNotifFilters = tab === "all" || tab === "system";

  const showOrderSection = tab !== "system" && tab !== "coupon";
  const showActionNotes = tab === "action" && unreadNotes.length > 0;

  const showMessagesSkeleton =
    shouldShowListSkeleton(initialLoading, serverNotes.length, loadError, refreshing) &&
    tab !== "coupon" &&
    tab !== "pay" &&
    tab !== "ship" &&
    !(tab === "all" && filteredEvents.length > 0);

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("messages.title")} onBack={handleBack} />
      <SubPageShelfAccent />
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = tab === item.key;
          const label = t(item.labelKey);
          const badge =
            item.key === "action"
              ? actionCount
              : item.key === "pay"
              ? payEvents.length
              : item.key === "system"
                ? unreadNotes.length
                : item.key === "coupon"
                  ? couponCount
                  : item.key === "ship"
                    ? shipEvents.length
                    : 0;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}${badge > 0 ? ` ${badge}` : ""}`}
              style={[styles.tab, active ? styles.tabOn : null]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabText, active ? styles.tabTextOn : null]}>
                {label}
                {badge > 0 ? ` ${badge > 9 ? "9+" : badge}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void refetch()} /> : null}
      {showNotifFilters ? (
        <View style={styles.notifFilters}>
          {NOTIF_FILTERS.map((item) => {
            const active = notifFilter === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.notifChip, active ? styles.notifChipOn : null]}
                onPress={() => setNotifFilter(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(item.labelKey)}
              >
                <Text style={[styles.notifChipText, active ? styles.notifChipTextOn : null]}>
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <ScreenScaffold
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
      >
        {tab === "coupon" ? (
          <View style={styles.couponCard}>
            <SectionHeading title={t("messages.couponReminder")} subtitle={t("common.sectionCoupons")} />
            <Text style={styles.couponText}>
              {couponCount > 0
                ? t("messages.couponAvailable", { count: couponCount })
                : t("messages.couponEmpty")}
            </Text>
            {onOpenCoupons ? (
              <Pressable
                style={styles.couponBtn}
                onPress={onOpenCoupons}
                accessibilityRole="button"
                accessibilityLabel={t("messages.viewCoupons")}
              >
                <Text style={styles.couponBtnText}>{t("messages.viewCoupons")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : showMessagesSkeleton ? (
          <ListSkeleton variant="row" rows={5} />
        ) : (
          <>
            {showActionNotes ? (
              <>
                <SectionHeading title={t("messages.actionSection")} subtitle={t("messages.unread")} />
                {unreadNotes.map((note) => {
                  const canOpenOrder =
                    note.refId &&
                    (note.category === "ORDER" || note.category === "REFUND");
                  const canOpenShip = note.category === "WAREHOUSE_SHIP" && note.refId;
                  const canOpenBox =
                    !!note.refId &&
                    (note.category === NOTIFICATION_CATEGORIES.RESTOCK ||
                      note.category === NOTIFICATION_CATEGORIES.PITY);
                  return (
                    <Pressable
                      key={note.id}
                      style={styles.orderRow}
                      disabled={!canOpenOrder && !canOpenShip && !canOpenBox && note.category !== "MARKETPLACE"}
                      onPress={() => {
                        markNoteRead(note.id);
                        if (note.category === "MARKETPLACE") {
                          onOpenMarketplace?.();
                          return;
                        }
                        if (canOpenShip && note.refId) {
                          setPendingShipRequestId(note.refId);
                          onOpenShipRequests?.();
                          return;
                        }
                        if (canOpenBox && note.refId) {
                          onOpenBox?.(note.refId);
                          return;
                        }
                        if (canOpenOrder && note.refId) onOpenOrder(note.refId);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={note.title}
                    >
                      <View style={styles.orderMeta}>
                        <Text style={styles.orderTitle}>
                          {note.title}
                          {" ·"}
                        </Text>
                        <Text style={styles.orderSub}>{note.body}</Text>
                      </View>
                      <Text style={styles.unreadDot}>{t("messages.unread")}</Text>
                    </Pressable>
                  );
                })}
              </>
            ) : null}
            {systemNotes.length > 0 && tab !== "action" ? (
              <>
                <SectionHeading title={t("messages.systemSection")} subtitle={t("common.sectionSystem")} />
                {systemNotes.map((note) => {
                  const canOpenOrder =
                    note.refId &&
                    (note.category === "ORDER" || note.category === "REFUND");
                  const canOpenShip = note.category === "WAREHOUSE_SHIP" && note.refId;
                  const canOpenBox =
                    !!note.refId &&
                    (note.category === NOTIFICATION_CATEGORIES.RESTOCK ||
                      note.category === NOTIFICATION_CATEGORIES.PITY);
                  return (
                    <Pressable
                      key={note.id}
                      style={styles.orderRow}
                      disabled={!canOpenOrder && !canOpenShip && !canOpenBox && note.category !== "MARKETPLACE"}
                      onPress={() => {
                        if (!note.read) markNoteRead(note.id);
                        if (note.category === "MARKETPLACE") {
                          onOpenMarketplace?.();
                          return;
                        }
                        if (canOpenShip && note.refId) {
                          setPendingShipRequestId(note.refId);
                          onOpenShipRequests?.();
                          return;
                        }
                        if (canOpenBox && note.refId) {
                          onOpenBox?.(note.refId);
                          return;
                        }
                        if (canOpenOrder && note.refId) onOpenOrder(note.refId);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={note.title}
                    >
                      <View style={styles.orderMeta}>
                        <Text style={styles.orderTitle}>
                          {note.title}
                          {!note.read ? " ·" : ""}
                        </Text>
                        <Text style={styles.orderSub}>{note.body}</Text>
                      </View>
                      {!note.read ? <Text style={styles.unreadDot}>{t("messages.unread")}</Text> : null}
                    </Pressable>
                  );
                })}
              </>
            ) : !loadError && !initialLoading && tab === "system" ? (
              <EmptyState
                title={t("messages.emptySystemTitle")}
                description={
                  notifFilter === "all"
                    ? t("messages.emptySystemDesc")
                    : t("messages.emptySystemFiltered", {
                        category: t(NOTIF_FILTERS.find((c) => c.key === notifFilter)!.labelKey),
                      })
                }
                variant="plain"
              />
            ) : !loadError && !initialLoading && tab === "all" && notifFilter !== "all" && systemNotes.length === 0 ? (
              <EmptyState
                title={t("messages.emptyCategoryTitle")}
                description={t("messages.emptyCategoryDesc", {
                  category: t(NOTIF_FILTERS.find((c) => c.key === notifFilter)!.labelKey),
                })}
                variant="plain"
              />
            ) : null}
            {showOrderSection ? (
              <>
                <SectionHeading title={t("messages.orderSection")} subtitle={t("common.sectionOrders")} />
                {!loadError && !initialLoading && filteredEvents.length === 0 ? (
                  <EmptyState
                    title={
                      tab === "action"
                        ? t("messages.emptyActionTitle")
                        : tab === "pay"
                          ? t("messages.emptyPayTitle")
                          : t("messages.emptyActivityTitle")
                    }
                    description={
                      tab === "action"
                        ? t("messages.emptyActionDesc")
                        : tab === "pay"
                          ? t("messages.emptyPayDesc")
                          : t("messages.emptyActivityDesc")
                    }
                    variant="plain"
                    actionLabel={
                      tab === "pay" && onOpenPendingOrders
                        ? t("messages.emptyPayAction")
                        : tab === "ship" && onGoWarehouse
                          ? t("messages.emptyShipAction")
                          : undefined
                    }
                    onAction={tab === "pay" ? onOpenPendingOrders : tab === "ship" ? onGoWarehouse : undefined}
                  />
                ) : loadError ? null : (
                  filteredEvents.map((event) => (
                    <Pressable
                      key={event.id}
                      style={styles.orderRow}
                      onPress={() => onOpenOrder(event.orderId)}
                      accessibilityRole="button"
                      accessibilityLabel={event.title}
                    >
                      <View style={styles.orderMeta}>
                        <Text style={styles.orderTitle}>{event.title}</Text>
                        <Text style={styles.orderSub}>{event.body}</Text>
                        {event.createdAt ? <Text style={styles.orderSub}>{event.createdAt}</Text> : null}
                      </View>
                      <Text style={styles.statusTag}>
                        {event.type === "pay" ? t("messages.statusPay") : t("messages.statusActivity")}
                      </Text>
                    </Pressable>
                  ))
                )}
              </>
            ) : null}
          </>
        )}
      </ScreenScaffold>
    </View>
  );
}

function buildMessageCenterViewStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPage },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { fontWeight: "700", color: colors.textSecondary, fontSize: typography.caption },
  tabTextOn: { color: colors.textOnBrand },
  content: { paddingBottom: layout.screenPaddingBottom, gap: spacing.sm },
  notifFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.sm,
  },
  notifChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifChipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  notifChipText: { fontSize: typography.caption, fontWeight: "700", color: colors.textSecondary },
  notifChipTextOn: { color: colors.textOnBrand },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderMeta: { flex: 1, marginRight: spacing.sm },
  orderTitle: { fontWeight: "800", color: colors.textPrimary },
  orderSub: { marginTop: 4, color: colors.textMuted, fontSize: typography.caption },
  statusTag: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: typography.caption,
    fontWeight: "700",
  },
  unreadDot: { fontSize: typography.caption, fontWeight: "700", color: colors.brand },
  couponCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  couponText: { color: colors.textSecondary, lineHeight: 22 },
  couponBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  couponBtnText: { color: colors.textOnBrand, fontWeight: "800" },
  });
}
