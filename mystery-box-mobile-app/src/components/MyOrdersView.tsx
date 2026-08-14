import { useCallback, useEffect, useRef } from "react";
import type { OptimizedListRef } from "./ui/OptimizedFlatList";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { OrderCard } from "./OrderCard";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { useAuthToken } from "../hooks/useAuthToken";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { Order } from "../types";
import { ORDER_TAB_KEYS } from "../config/orderFilterConfig";
import type { OrderDisplayRow } from "../utils/orderDisplayRows";
import { rememberListScroll, peekListScroll } from "../utils/listScrollMemory";

type Props = {
  displayRows: OrderDisplayRow[];
  tabCounts?: Record<string, number>;
  orders: Order[];
  orderStatusFilter: string;
  setOrderStatusFilter: (value: string) => void;
  orderKeyword: string;
  setOrderKeyword: (value: string) => void;
  autoRefreshOrders: boolean;
  setAutoRefreshOrders: (value: boolean) => void;
  onBack: () => void;
  pageLoading: boolean;
  onRefresh: () => void;
  onOpenOrderDetails: (id: string) => void;
  onPay: (id: string) => void;
  onCancel: (id: string) => void;
  isUnpaidOrder: (order: Order) => boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  onGoShopping?: () => void;
  onRequireLogin?: () => void;
};

export function MyOrdersView(props: Props) {
  const {
    displayRows,
    tabCounts,
    orders: _orders,
    orderStatusFilter,
    setOrderStatusFilter,
    orderKeyword,
    setOrderKeyword,
    onBack,
    pageLoading,
    onRefresh,
    onOpenOrderDetails,
    onPay,
    onCancel,
    isUnpaidOrder,
    onLoadMore,
    hasMore,
    loadingMore,
    loadError,
    onRetryLoad,
    onGoShopping,
    onRequireLogin,
  } = props;
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildMyOrdersStyles);
  const listRef = useRef<OptimizedListRef<OrderDisplayRow>>(null);
  const scrollKey = `orders:${orderStatusFilter}`;

  useEffect(() => {
    const offset = peekListScroll(scrollKey);
    if (offset == null || offset <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [scrollKey]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setOrderKeyword(text);
    },
    [setOrderKeyword],
  );

  return (
    <View style={styles.root}>
      <SubPageHeader
        title={
          (tabCounts?.ALL ?? 0) > 0
            ? `${t("orders.title")} (${tabCounts!.ALL})`
            : t("orders.title")
        }
        onBack={onBack}
      />
      <View style={styles.searchWrap}>
        <TextInput
          value={orderKeyword}
          onChangeText={handleSearchChange}
          placeholder={t("orders.searchPlaceholder")}
          placeholderTextColor={themeColors.textPlaceholder}
          style={styles.search}
          clearButtonMode="while-editing"
          accessibilityLabel={t("orders.searchPlaceholder")}
        />
      </View>
      <View style={styles.tabs}>
        {ORDER_TAB_KEYS.map((tab) => {
          const active = orderStatusFilter === tab.id;
          const count = tabCounts?.[tab.id] ?? 0;
          const label = count > 0 ? `${t(tab.labelKey)} (${count})` : t(tab.labelKey);
          return (
            <Pressable
              key={tab.id}
              style={styles.tabItem}
              onPress={() => setOrderStatusFilter(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]} numberOfLines={1}>
                {label}
              </Text>
              {active ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>
      {loadError ? <ListErrorBanner message={loadError} onRetry={onRetryLoad} /> : null}
      {shouldShowListSkeleton(pageLoading, displayRows.length, loadError ?? null) ? (
        <ListSkeleton variant="row" rows={6} />
      ) : (
      <OptimizedFlatList
        ref={listRef}
        listVariant="row"
        data={displayRows}
        keyExtractor={(item) => item.key}
        refreshing={pageLoading}
        onRefresh={onRefresh}
        onScroll={(event) => {
          rememberListScroll(scrollKey, event.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={120}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <OrderCard
            order={item.order}
            displayTitle={item.productTitle}
            displayProduct={item.product}
            shipPending={item.shipPending}
            authToken={authToken}
            canCancel={isUnpaidOrder(item.order)}
            onOpenDetails={onOpenOrderDetails}
            onPay={onPay}
            onCancel={onCancel}
          />
        )}
        ListEmptyComponent={listEmptyWhenOk(
          loadError ?? null,
          <EmptyState
            title={authToken ? t("orders.emptyTitle") : t("orders.guestEmptyTitle")}
            description={authToken ? t("orders.emptyDesc") : t("orders.guestEmptyDesc")}
            variant="plain"
            actionLabel={
              !authToken && onRequireLogin
                ? t("orders.goLogin")
                : onGoShopping
                  ? t("orders.goShopping")
                  : undefined
            }
            onAction={!authToken && onRequireLogin ? onRequireLogin : onGoShopping}
          />,
        )}
        onEndReached={() => {
          if (hasMore && onLoadMore && !pageLoading && !loadingMore) onLoadMore();
        }}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          loadingMore ? (
            <Text style={styles.footer}>{t("orders.loadingMore")}</Text>
          ) : hasMore ? (
            <Text style={styles.footer}>{t("orders.pullLoadMore")}</Text>
          ) : null
        }
      />
      )}
    </View>
  );
}

function buildMyOrdersStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPage },
  searchWrap: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.sm, paddingTop: spacing.xs },
  search: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.textPrimary,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.bgCard,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xs,
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: spacing.md },
  tabText: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: "600" },
  tabTextActive: { color: colors.brand, fontWeight: "800" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  list: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: layout.screenPaddingBottom,
    gap: spacing.sm,
  },
  footer: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.lg, fontSize: typography.caption },
  });
}
