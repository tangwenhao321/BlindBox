import { useTranslation } from "react-i18next";
import { ORDER_STATUS } from "../../config/constants";
import { FEATURE_KEYS } from "../../config/featureRegistry";
import { useMainTabsAccountViewProps, useMainTabsBoxViewProps, useMainTabsOrderViewProps, useMainTabsShellViewState, useProfileTabScreenProps } from "../../hooks/useMainTabsViewSlices";
import { useHomeCatalogSideData } from "../../hooks/useHomeCatalogSideData";
import { BoxListView } from "../BoxListView";
import { ErrorBoundary } from "../ErrorBoundary";
import { ProfileView } from "../ProfileView";
import { WarehouseView } from "../WarehouseView";
import { isFeatureFlagEnabled } from "../../hooks/useFeatureFlag";
import { useAppPublicConfig } from "../../hooks/useAppPublicConfig";

/** Root tab screens (home / mall / warehouse / profile) — reads state from MainTabsProvider. */
export function MainTabsTabContent() {
  const { t } = useTranslation();
  const {
    view,
    setView,
    resetTab,
    requireAuth,
    pageLoading,
  } = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();
  const orderViewProps = useMainTabsOrderViewProps();
  const { featureViewProps } = useMainTabsAccountViewProps();
  const profileTabProps = useProfileTabScreenProps();
  const publicConfig = useAppPublicConfig();
  const marketplaceEnabled = isFeatureFlagEnabled("marketplace", publicConfig.featureFlags);

  const {
    boxes,
    mallBoxes,
    mallKeyword,
    addresses,
    selectedAddressId,
    onRefreshAll,
    onRefreshMall,
    onLoadMore,
    onLoadMoreMall,
    hasMoreBoxes,
    hasMoreMallBoxes,
    loadingMoreBoxes,
    loadingMoreMallBoxes,
    onMallCategoryChange,
    onMallSearch,
    onOpenDetails,
    bannerUri,
    bannerTitle,
    bannerSubtitle,
    showNewcomerBar,
    onNewcomerPress,
    onOpenAddressModal,
    onOpenAddressManage,
    onSelectAddress,
    onOpenCatalogSearch,
    onOpenPlayGuide,
    onOpenProbabilityDisclosure,
    boxesLoadError,
    mallLoadError,
  } = boxViewProps;

  const {
    orders,
    onOpenOrderDetails,
    onRedeemToBalance,
    setOrderStatusFilter,
  } = orderViewProps;

  const homeCatalogSideData = useHomeCatalogSideData("home");
  const mallCatalogSideData = useHomeCatalogSideData("mall");

  if (view === "home") {
    return (
      <ErrorBoundary onReset={() => resetTab("home")}>
        <BoxListView
          mode="home"
          orders={orders}
          onContinuePendingPayment={(orderId) => {
            void onOpenOrderDetails(orderId);
          }}
          onViewAllPending={() => {
            setOrderStatusFilter(ORDER_STATUS.TO_BE_PAID);
            setView("orders");
          }}
          boxes={boxes}
          pageLoading={pageLoading}
          hasMore={hasMoreBoxes}
          loadingMore={loadingMoreBoxes}
          bannerUri={bannerUri}
          bannerTitle={bannerTitle}
          bannerSubtitle={bannerSubtitle}
          onRefresh={onRefreshAll}
          onLoadMore={onLoadMore}
          onOpenDetails={onOpenDetails}
          onContactSupport={() => requireAuth?.(() => featureViewProps.onOpenFeature(FEATURE_KEYS.CONTACT_SUPPORT))}
          showNewcomerBar={showNewcomerBar}
          onNewcomerPress={onNewcomerPress}
          onOpenCatalogSearch={onOpenCatalogSearch}
          onOpenPlayGuide={onOpenPlayGuide}
          onOpenProbabilityDisclosure={onOpenProbabilityDisclosure}
          catalogLoadError={boxesLoadError}
          onRetryCatalog={onRefreshAll}
          catalogSideData={homeCatalogSideData}
        />
      </ErrorBoundary>
    );
  }

  if (view === "mall") {
    return (
      <BoxListView
        mode="mall"
        boxes={mallBoxes}
        mallKeyword={mallKeyword}
        pageLoading={pageLoading}
        hasMore={hasMoreMallBoxes}
        loadingMore={loadingMoreMallBoxes}
        bannerTitle={t("home.bannerMallFeatured")}
        bannerSubtitle={t("mainTabs.mallBannerSub")}
        onRefresh={onRefreshMall}
        onLoadMore={onLoadMoreMall}
        onOpenDetails={onOpenDetails}
        onMallCategoryChange={onMallCategoryChange}
        onMallSearch={onMallSearch}
        onOpenCatalogSearch={onOpenCatalogSearch}
        onOpenPlayGuide={onOpenPlayGuide}
        onOpenProbabilityDisclosure={onOpenProbabilityDisclosure}
        catalogLoadError={mallLoadError}
        onRetryCatalog={onRefreshMall}
        catalogSideData={mallCatalogSideData}
      />
    );
  }

  if (view === "warehouse") {
    return (
      <ErrorBoundary onReset={() => resetTab("home")}>
        <WarehouseView
          isActive
          orders={orders}
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={onSelectAddress}
          onOpenAddressManage={onOpenAddressManage}
          onOpenOrder={(orderId) => {
            onOpenOrderDetails(orderId);
          }}
          onRedeemToBalance={onRedeemToBalance}
          onRedeemOrderItem={orderViewProps.onRedeemOrderItem}
          onDecomposeOrderItem={orderViewProps.onDecomposeOrderItem}
          onGoHome={() => resetTab("home")}
          onGoMarketplace={marketplaceEnabled ? () => setView("marketplace") : undefined}
          onOpenShipRequests={() => {
            if (!requireAuth?.()) return;
            setView("shipRequests");
          }}
          onOpenExchangeMall={() => {
            if (!requireAuth?.()) return;
            setView("exchangeMall");
          }}
          onRequireLogin={() => {
            requireAuth?.();
          }}
        />
      </ErrorBoundary>
    );
  }

  if (view === "profile") {
    return <ProfileView {...profileTabProps} />;
  }

  return null;
}
