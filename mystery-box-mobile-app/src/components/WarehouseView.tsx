import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { RemoteImage } from "./ui/RemoteImage";
import { resolveBoxImageUrl, resolveProductImageUrl } from "../utils/boxImage";
import { useTabletLayout } from "../hooks/useTabletLayout";
import { LinearGradient } from "expo-linear-gradient";
import { ORDER_STATUS } from "../config/constants";
import { EmptyState } from "./EmptyState";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { SectionHeading } from "./ui/SectionHeading";
import i18n from "../i18n";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { useAuthToken } from "../hooks/useAuthToken";
import { useWarehouseData } from "../hooks/useWarehouseData";
import { WarehouseBannersSection } from "./warehouse/WarehouseBannersSection";
import { WarehouseToolbarSection } from "./warehouse/WarehouseToolbarSection";
import { layout, radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { qualityLabelFromRaw } from "../utils/quality";
import { formatOrderIdShort } from "../order-utils";
import { estimateDecomposeFragments, estimateRedeemBalance } from "../utils/redeemPreview";
import { formatCurrency } from "../utils/formatCurrency";
import { createMarketplaceListing } from "../services/marketplaceService";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import { queueIfOffline } from "../utils/offlineSubmitGuard";
import { PriceInputModal } from "./ui/PriceInputModal";
import { WarehouseShipModal } from "./WarehouseShipModal";
import { LustreCardEdgeShimmer } from "./ui/LustreCardEdgeShimmer";
import { lustreTierFromQuality } from "../effects/lustrePalette";
import { resolveThemedLustre } from "../effects/revealTheme";
import { shouldReduceLustreMotion } from "../effects/revealRemote";
import { InlineGuideBanner } from "./ui/InlineGuideBanner";
import { dismissWarehouseGuide, shouldShowWarehouseGuide } from "../utils/uxGuideStorage";
import type { Address, Order } from "../types";

type Props = {
  isActive?: boolean;
  orders: Order[];
  addresses?: Address[];
  selectedAddressId?: string;
  onSelectAddress?: (id: string) => void;
  onOpenAddressManage?: () => void;
  onOpenOrder: (orderId: string) => void;
  onRedeemToBalance?: (orderId: string) => void;
  onRedeemOrderItem?: (orderItemId: string, productId: string) => void;
  onDecomposeOrderItem?: (orderItemId: string, productId: string) => void;
  onGoHome?: () => void;
  onGoMarketplace?: () => void;
  onOpenShipRequests?: () => void;
  onOpenExchangeMall?: () => void;
};

function statusLabel(status: string) {
  if (status === "MARKETPLACE") return i18n.t("warehouse.statusMarketplacePending");
  if (status === "SHIPPED") return i18n.t("warehouse.statusMarketplaceShipped");
  if (status === ORDER_STATUS.TO_BE_DELIVERED) return i18n.t("warehouse.statusToShip");
  if (status === ORDER_STATUS.TO_BE_RECEIVED) return i18n.t("warehouse.statusToReceive");
  if (status === ORDER_STATUS.FINISHED || status === ORDER_STATUS.COMPLETED) return i18n.t("warehouse.statusFinished");
  return status;
}

function WarehouseRareThumb({
  tier,
  innerBackground,
  children,
}: {
  tier?: string;
  innerBackground: string;
  children: ReactNode;
}) {
  const lustreTier = lustreTierFromQuality(tier);
  if (!lustreTier) return <>{children}</>;
  const lustre = resolveThemedLustre(lustreTier);
  return (
    <LustreCardEdgeShimmer
      width={52}
      height={52}
      borderRadius={radius.md}
      colors={lustre.rim}
      borderWidth={2}
      reduceMotion={shouldReduceLustreMotion()}
      innerBackground={innerBackground}
    >
      {children}
    </LustreCardEdgeShimmer>
  );
}

export function WarehouseView({
  isActive = false,
  orders,
  addresses = [],
  selectedAddressId = "",
  onSelectAddress,
  onOpenAddressManage,
  onOpenOrder,
  onRedeemToBalance,
  onRedeemOrderItem,
  onDecomposeOrderItem,
  onGoHome,
  onGoMarketplace,
  onOpenShipRequests,
  onOpenExchangeMall,
}: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildWarehouseStyles);
  const { confirm } = useConfirmDialog();
  const warehouse = useWarehouseData({ isActive, authToken, orders });
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [listingTarget, setListingTarget] = useState<{
    id: string;
    name: string;
    orderId: string;
    orderItemId?: string;
    productId?: string;
  } | null>(null);
  const [shipModalVisible, setShipModalVisible] = useState(false);
  const [shipModalItems, setShipModalItems] = useState<
    { orderId: string; orderItemId: string; productId: string }[]
  >([]);
  const [showGuide, setShowGuide] = useState(false);
  const { isTablet } = useTabletLayout();

  useEffect(() => {
    if (!authToken || warehouse.items.length === 0) {
      setShowGuide(false);
      return;
    }
    void shouldShowWarehouseGuide().then(setShowGuide);
  }, [authToken, warehouse.items.length]);

  const openShipModal = (lines: { orderId: string; orderItemId: string; productId: string }[]) => {
    if (!lines.length) return;
    if (!addresses.length) {
      onOpenAddressManage?.();
      return;
    }
    const defaultId = selectedAddressId || addresses.find((a) => a.top)?.id || addresses[0]?.id || "";
    if (defaultId && defaultId !== selectedAddressId) {
      onSelectAddress?.(defaultId);
    }
    setShipModalItems(lines);
    setShipModalVisible(true);
  };

  const selectedShipLines = useMemo(
    () =>
      warehouse.shippableItems
        .filter((i) => warehouse.selectedIds.has(i.id) && i.productId && i.orderItemId)
        .map((i) => ({
          orderId: i.orderId,
          orderItemId: i.orderItemId!,
          productId: i.productId!,
        })),
    [warehouse.selectedIds, warehouse.shippableItems],
  );

  const refreshWarehouseList = useCallback(async () => {
    await warehouse.reloadApi();
    warehouse.reloadFragmentBalance();
  }, [warehouse]);

  const handleRedeemOrderItem = useCallback(
    async (orderItemId: string, productId: string) => {
      if (!onRedeemOrderItem) return;
      try {
        await onRedeemOrderItem(orderItemId, productId);
        await refreshWarehouseList();
      } catch {
        // parent shows toast
      }
    },
    [onRedeemOrderItem, refreshWarehouseList],
  );

  const handleDecomposeOrderItem = useCallback(
    async (orderItemId: string, productId: string) => {
      if (!onDecomposeOrderItem) return;
      try {
        await onDecomposeOrderItem(orderItemId, productId);
        await refreshWarehouseList();
      } catch {
        // parent shows toast
      }
    },
    [onDecomposeOrderItem, refreshWarehouseList],
  );

  const handleRedeemOrderBalance = useCallback(
    async (orderId: string) => {
      if (!onRedeemToBalance) return;
      try {
        await onRedeemToBalance(orderId);
        await refreshWarehouseList();
      } catch {
        // parent shows toast
      }
    },
    [onRedeemToBalance, refreshWarehouseList],
  );

  const listHeader = (
    <>
      <View style={styles.pageHeader}>
        <SectionHeading title={t("warehouse.title")} subtitle={t("warehouse.subtitle")} accent={themeColors.brand} />
        <Text style={styles.headerHint}>{t("warehouse.hint")}</Text>
      </View>
      <WarehouseBannersSection
        authToken={authToken}
        fragmentBalance={warehouse.fragmentBalance}
        fragmentBalanceError={warehouse.fragmentBalanceError}
        onReloadFragmentBalance={warehouse.reloadFragmentBalance}
        shipRequests={warehouse.shipRequests}
        onGoMarketplace={onGoMarketplace}
        onOpenExchangeMall={onOpenExchangeMall}
        onOpenShipRequests={onOpenShipRequests}
      />
      {showGuide ? (
        <InlineGuideBanner
          testID="warehouseGuideBanner"
          title={t("warehouse.guideTitle")}
          body={t("warehouse.guideBody")}
          onDismiss={() => {
            setShowGuide(false);
            void dismissWarehouseGuide();
          }}
        />
      ) : null}
      <WarehouseToolbarSection
        mainTab={warehouse.mainTab}
        pendingOnly={warehouse.pendingOnly}
        itemCount={warehouse.totalCount ?? warehouse.items.length}
        countApproximate={warehouse.countApproximate}
        selectMode={warehouse.selectMode}
        authToken={authToken}
        onSelectMainTab={warehouse.setMainTab}
        onTogglePendingOnly={() => warehouse.setPendingOnly(!warehouse.pendingOnly)}
        onToggleSelectMode={() => {
          if (warehouse.selectMode) warehouse.exitSelectMode();
          else warehouse.setSelectMode(true);
        }}
        onGoMarketplace={onGoMarketplace}
      />
      {authToken && warehouse.apiError ? (
        <ListErrorBanner message={warehouse.apiError} onRetry={() => void warehouse.reloadApi()} />
      ) : null}
    </>
  );

  return (
    <View style={styles.root}>
      <OptimizedFlatList
        style={styles.listFlex}
        listVariant="row"
        data={warehouse.items}
        keyExtractor={(item) => item.id}
        numColumns={isTablet ? 2 : 1}
        key={isTablet ? "warehouse-tablet" : "warehouse-phone"}
        ListHeaderComponent={listHeader}
        contentContainerStyle={StyleSheet.flatten([
          styles.list,
          isTablet ? styles.listTablet : null,
          warehouse.selectMode ? { paddingBottom: layout.screenPaddingBottom + 88 } : null,
        ])}
        onEndReached={() => void warehouse.loadMoreWarehouse()}
        onEndReachedThreshold={0.35}
        renderItem={({ item }) => {
          const canRedeem =
            !!onRedeemToBalance &&
            (item.status === ORDER_STATUS.TO_BE_DELIVERED || item.status === ORDER_STATUS.TO_BE_RECEIVED);
          const shipSelectable = warehouse.selectMode && item.productId && !item.pendingShip &&
            (item.status === ORDER_STATUS.TO_BE_DELIVERED || item.status === "MARKETPLACE");
          const canQuickShip =
            !warehouse.selectMode &&
            warehouse.mainTab === "product" &&
            authToken &&
            item.productId &&
            item.orderItemId &&
            !item.pendingShip &&
            (item.status === ORDER_STATUS.TO_BE_DELIVERED || item.status === "MARKETPLACE");
          const checked = warehouse.selectedIds.has(item.id);
          return (
            <View style={[styles.card, isTablet ? styles.cardGrid : null]}>
              <View style={styles.cardTop}>
                {shipSelectable ? (
                  <Pressable
                    style={[styles.checkBox, checked ? styles.checkBoxOn : null]}
                    onPress={() => warehouse.toggleSelect(item.id)}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={t("warehouse.selectA11y", { name: item.name })}
                  >
                    {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                  </Pressable>
                ) : null}
                <Pressable
                  style={({ pressed }) => [styles.cardMainPress, pressed ? styles.cardPressed : null]}
                  onPress={() => onOpenOrder(item.orderId)}
                  accessibilityRole="button"
                  accessibilityLabel={t("warehouse.openOrderA11y", { name: item.name })}
                >
                  <View style={styles.thumb}>
                    <WarehouseRareThumb tier={item.tier} innerBackground={themeColors.bgBrandSoft}>
                      {warehouse.mainTab === "product" && item.productCover && item.productId ? (
                        <RemoteImage
                          uri={resolveProductImageUrl(item.productId, item.name, item.productCover)}
                          style={styles.thumbImg}
                        />
                      ) : warehouse.mainTab === "box" && item.mysteryBoxCover ? (
                        <RemoteImage
                          uri={resolveBoxImageUrl({ id: item.orderId, name: item.name, cover: item.mysteryBoxCover })}
                          style={styles.thumbImg}
                        />
                      ) : (
                        <Text style={styles.thumbIcon}>✦</Text>
                      )}
                    </WarehouseRareThumb>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.cardMeta}>
                      {t("warehouse.orderMeta", {
                        id: formatOrderIdShort(item.orderId || "") || "—",
                        status: statusLabel(item.status),
                      })}
                      {warehouse.mainTab === "box" && item.prizeCount
                        ? ` · ${t("warehouse.prizeCount", { count: item.prizeCount })}`
                        : ""}
                    </Text>
                    {item.pendingShip ? (
                      <Text style={styles.pendingBadge}>{t("warehouse.pendingShipBadge")}</Text>
                    ) : null}
                  </View>
                  {item.tier ? (
                    <LinearGradient
                      colors={[themeColors.brand, themeColors.brandGradientEnd]}
                      style={styles.tierBadge}
                    >
                      <Text style={styles.tierText}>{qualityLabelFromRaw(item.tier, t)}</Text>
                    </LinearGradient>
                  ) : null}
                </Pressable>
              </View>
              {!warehouse.selectMode &&
              warehouse.mainTab === "product" &&
              item.orderItemId &&
              item.productId &&
              (canQuickShip || (canRedeem && onRedeemOrderItem)) ? (
                <View style={styles.actionRow}>
                  {canQuickShip ? (
                    <Pressable
                      style={styles.redeemBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t("warehouse.shipApplyA11y")}
                      onPress={() =>
                        openShipModal([
                          {
                            orderId: item.orderId,
                            orderItemId: item.orderItemId!,
                            productId: item.productId!,
                          },
                        ])
                      }
                    >
                      <Text style={styles.redeemText}>{t("warehouse.shipApply")}</Text>
                    </Pressable>
                  ) : null}
                  {canRedeem && onRedeemOrderItem ? (
                    <Pressable
                    style={styles.redeemBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t("warehouse.redeemBalance")}
                    onPress={() => {
                      void (async () => {
                        const redeemEstimate = estimateRedeemBalance(null, item.tier);
                        const ok = await confirm({
                          title: t("warehouse.redeemItemTitle"),
                          message: t("warehouse.redeemItemMessagePreview", {
                            amount: formatCurrency(redeemEstimate ?? 0),
                          }),
                          confirmLabel: t("warehouse.redeemConfirm"),
                          destructive: true,
                        });
                        if (ok) void handleRedeemOrderItem(item.orderItemId!, item.productId!);
                      })();
                    }}
                  >
                    <Text style={styles.redeemText}>{t("warehouse.redeemBalance")}</Text>
                  </Pressable>
                  ) : null}
                  {canRedeem && onDecomposeOrderItem ? (
                    <Pressable
                      style={styles.redeemBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t("warehouse.decompose")}
                      onPress={() => {
                        void (async () => {
                          const fragments = estimateDecomposeFragments(item.tier, null);
                          const ok = await confirm({
                            title: t("warehouse.decomposeItemTitle"),
                            message: t("warehouse.decomposeItemMessagePreview", { fragments }),
                            confirmLabel: t("warehouse.decomposeConfirm"),
                            destructive: true,
                          });
                          if (ok) void handleDecomposeOrderItem(item.orderItemId!, item.productId!);
                        })();
                      }}
                    >
                      <Text style={styles.redeemText}>{t("warehouse.decompose")}</Text>
                    </Pressable>
                  ) : null}
                  {authToken && item.source !== "MARKETPLACE" ? (
                    <Pressable
                      style={styles.redeemBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t("warehouse.listToMarket")}
                      onPress={() => {
                        setListingTarget(item);
                        setPriceModalVisible(true);
                      }}
                    >
                      <Text style={styles.redeemText}>{t("warehouse.listToMarket")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {!warehouse.selectMode && canRedeem && warehouse.mainTab === "box" ? (
                <Pressable
                  style={styles.redeemBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t("warehouse.redeemOrderBalance")}
                  onPress={() => {
                    void (async () => {
                      const ok = await confirm({
                        title: t("warehouse.redeemItemTitle"),
                        message: t("warehouse.redeemOrderMessage"),
                        confirmLabel: t("warehouse.redeemConfirm"),
                        destructive: true,
                      });
                      if (ok) void handleRedeemOrderBalance(item.orderId);
                    })();
                  }}
                >
                  <Text style={styles.redeemText}>{t("warehouse.redeemOrderBalance")}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          warehouse.apiLoading ? (
            <ListSkeleton variant="row" rows={4} />
          ) : listEmptyWhenOk(
              authToken && warehouse.apiError ? warehouse.apiError : null,
              <EmptyState
                title={t("warehouse.emptyTitle")}
                description={t("warehouse.emptyDesc")}
                variant="plain"
                actionLabel={onGoHome ? t("warehouse.goHomeOpen") : undefined}
                onAction={onGoHome}
              />,
            )
        }
      />
      {warehouse.selectMode && authToken ? (
        <View style={[styles.shipBar, { bottom: layout.screenPaddingBottom }]}>
          {/* bottom uses layout.screenPaddingBottom; list extra uses layout.tabBarClearance (see BottomTabBar) */}
          <Pressable
            onPress={warehouse.selectAllShippable}
            accessibilityRole="button"
            accessibilityLabel={t("warehouse.shipSelectAll")}
          >
            <Text style={styles.shipSelectAll}>{t("warehouse.shipSelectAll")}</Text>
          </Pressable>
          <Text style={styles.shipBarText}>{t("warehouse.shipBarSelected", { count: selectedShipLines.length })}</Text>
          <Pressable
            style={[styles.shipBarBtn, selectedShipLines.length === 0 ? styles.shipBarBtnDisabled : null]}
            disabled={selectedShipLines.length === 0}
            accessibilityRole="button"
            accessibilityLabel={t("warehouse.shipApplyA11y")}
            onPress={() => openShipModal(selectedShipLines)}
          >
            <Text style={styles.shipBarBtnText}>{t("warehouse.shipApply")}</Text>
          </Pressable>
        </View>
      ) : null}
      {authToken ? (
        <WarehouseShipModal
          visible={shipModalVisible}
          authToken={authToken}
          items={shipModalItems}
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={(id) => onSelectAddress?.(id)}
          onOpenAddressManage={onOpenAddressManage}
          onClose={() => {
            setShipModalVisible(false);
            setShipModalItems([]);
          }}
          onSubmitted={() => {
            warehouse.exitSelectMode();
            void warehouse.reloadApi();
            void warehouse.reloadShipRequests();
          }}
          onViewShipRequests={onOpenShipRequests}
        />
      ) : null}
      <PriceInputModal
        visible={priceModalVisible}
        title={t("warehouse.listModalTitle")}
        hint={t("warehouse.listModalHint")}
        onClose={() => {
          setPriceModalVisible(false);
          setListingTarget(null);
        }}
        onConfirm={(price) => {
          if (!authToken || !listingTarget?.orderItemId || !listingTarget.productId) return;
          const payload = {
            orderId: listingTarget.orderId,
            orderItemId: listingTarget.orderItemId,
            productId: listingTarget.productId,
            price,
          };
          const perform = async () => {
            await createMarketplaceListing(authToken, payload);
            trackEvent(ANALYTICS_EVENTS.MARKETPLACE_LIST_CREATE, {
              orderId: listingTarget.orderId,
              productId: listingTarget.productId,
              price,
            });
            toast.success(t("warehouse.listSuccess"));
            void warehouse.reloadApi();
          };
          if (
            queueIfOffline(t("offline.actionListMarket"), perform, {
              kind: "marketplaceList",
              token: authToken,
              payload,
            })
          ) {
            setPriceModalVisible(false);
            setListingTarget(null);
            return;
          }
          void perform()
            .then(() => {
              setPriceModalVisible(false);
              setListingTarget(null);
            })
            .catch((error) => toast.error(parseError(error)));
        }}
      />
    </View>
  );
}

function buildWarehouseStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    pageHeader: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md, paddingBottom: spacing.sm },
    headerHint: { marginTop: -spacing.sm, marginBottom: spacing.sm, color: colors.textMuted, fontSize: typography.caption },
    listFlex: { flex: 1 },
    list: {
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: spacing.sm,
      paddingBottom: layout.screenPaddingBottom + layout.tabBarClearance,
    },
    listTablet: { maxWidth: 720, alignSelf: "center", width: "100%" },
    checkBox: {
      width: 22,
      height: 22,
      marginRight: spacing.xs,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkBoxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    checkMark: { color: colors.textOnBrand, fontWeight: "900", fontSize: 12 },
    shipBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: layout.screenPaddingX,
      paddingVertical: spacing.md,
      backgroundColor: colors.bgCard,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    shipBarText: { fontWeight: "700", color: colors.textPrimary, flex: 1, textAlign: "center" },
    shipSelectAll: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    pendingBadge: { marginTop: 2, fontSize: typography.caption, color: colors.warning, fontWeight: "700" },
    shipBarBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    shipBarBtnDisabled: { opacity: 0.45 },
    shipBarBtnText: { color: colors.textOnBrand, fontWeight: "800" },
    cardMainPress: { flex: 1, flexDirection: "row", alignItems: "center", minWidth: 0 },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    cardGrid: { flex: 1, minWidth: 0 },
    cardPressed: { opacity: 0.94 },
    cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.bgBrandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbIcon: { fontSize: 22, color: colors.brandText, fontWeight: "900" },
    thumbImg: { width: 52, height: 52, borderRadius: radius.md },
    cardBody: { flex: 1, gap: 4 },
    cardName: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
    cardMeta: { fontSize: typography.caption, color: colors.textMuted },
    tierBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    tierText: { color: colors.textOnBrand, fontSize: typography.micro, fontWeight: "800" },
    actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    redeemBtn: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.brand,
      alignItems: "center",
      backgroundColor: colors.bgBrandSoft,
    },
    redeemText: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  });
}
