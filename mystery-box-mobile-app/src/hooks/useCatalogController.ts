import { useMemo, useRef, type MutableRefObject } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import type { MysteryBox, Order } from "../types";
import { useAppCatalogOrchestration } from "./useAppCatalogOrchestration";
import type {
  MainTabsCatalogSearchSlice,
  MainTabsCatalogSlice,
} from "./mainTabsSliceTypes";

export type CatalogControllerInput = {
  token: string;
  view: AppView;
  loading: boolean;
  boxesCount: number;
  mallBoxesCount: number;
  navigate: (view: AppView) => void;
  setPageLoading: (value: boolean) => void;
  loadMallBoxes: (token: string, categoryId?: string, page?: number, keyword?: string) => Promise<void>;
  openDetailsRef: MutableRefObject<(id: string) => Promise<unknown>>;
  resetCouponRef: MutableRefObject<() => void>;
  loadCouponsRef: MutableRefObject<() => Promise<void>>;
  refreshAllWithLoadingRef: MutableRefObject<
    (usingToken?: string, options?: { includeHeavy?: boolean; includeMall?: boolean }) => Promise<void>
  >;
  boxes: MysteryBox[];
  mallBoxes: MysteryBox[];
  mallCategoryId: string;
  mallKeyword: string;
  boxesLoadError: string | null;
  mallLoadError: string | null;
  loadMoreBoxes: (token: string) => Promise<void>;
  loadMoreMallBoxes: (token: string) => Promise<void>;
  refreshMallCatalog: (token: string) => Promise<void>;
  hasMoreBoxes: boolean;
  hasMoreMallBoxes: boolean;
  loadingMoreBoxes: boolean;
  loadingMoreMallBoxes: boolean;
  openNewcomerOffer: () => void;
  orders: Order[];
  ordersReady: boolean;
};

export type CatalogControllerResult = {
  catalog: ReturnType<typeof useAppCatalogOrchestration>;
  catalogSlice: MainTabsCatalogSlice;
  catalogSearchSlice: MainTabsCatalogSearchSlice;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  loadHomeBannerRef: MutableRefObject<(token: string) => Promise<void>>;
  clearHomeBannerOnSessionCleanup: () => void;
};

export function useCatalogController(input: CatalogControllerInput): CatalogControllerResult {
  const {
    token,
    view,
    loading,
    boxesCount,
    mallBoxesCount,
    navigate,
    setPageLoading,
    loadMallBoxes,
    openDetailsRef,
    resetCouponRef,
    loadCouponsRef,
    refreshAllWithLoadingRef,
    boxes,
    mallBoxes,
    mallCategoryId,
    mallKeyword,
    boxesLoadError,
    mallLoadError,
    loadMoreBoxes,
    loadMoreMallBoxes,
    refreshMallCatalog,
    hasMoreBoxes,
    hasMoreMallBoxes,
    loadingMoreBoxes,
    loadingMoreMallBoxes,
    openNewcomerOffer,
    orders,
    ordersReady,
  } = input;

  const catalog = useAppCatalogOrchestration({
    token,
    view,
    loading,
    boxesCount,
    mallBoxesCount,
    navigate,
    setPageLoading,
    loadMallBoxes,
    openDetails: (id) => openDetailsRef.current(id),
    resetCouponSelection: () => resetCouponRef.current(),
    loadAvailableCoupons: () => loadCouponsRef.current(),
    refreshAllWithLoading: (usingToken, options) => refreshAllWithLoadingRef.current(usingToken, options),
    orders,
    ordersReady,
  });

  const loadHomeBannerRef = useRef(catalog.loadHomeBanner);
  loadHomeBannerRef.current = catalog.loadHomeBanner;

  const catalogSlice = useMemo<MainTabsCatalogSlice>(
    () => ({
      boxes,
      mallBoxes,
      mallCategoryId,
      mallKeyword,
      boxesLoadError,
      mallLoadError,
      activeBox: catalog.activeBox,
      setActiveBox: catalog.setActiveBox,
      loadMallBoxes,
      loadMoreBoxes,
      loadMoreMallBoxes,
      refreshMallCatalog,
      setPageLoading,
      hasMoreBoxes,
      hasMoreMallBoxes,
      loadingMoreBoxes,
      loadingMoreMallBoxes,
      handleMallCategoryChange: catalog.handleMallCategoryChange,
      handleMallSearch: catalog.handleMallSearch,
      homeBanner: catalog.homeBanner,
      openDetailsPage: catalog.openDetailsPage,
      selectedActivity: catalog.selectedActivity,
      setSelectedActivity: catalog.setSelectedActivity,
      openNewcomerOffer,
    }),
    [
      boxes,
      mallBoxes,
      mallCategoryId,
      mallKeyword,
      boxesLoadError,
      mallLoadError,
      catalog.activeBox,
      catalog.setActiveBox,
      catalog.handleMallCategoryChange,
      catalog.handleMallSearch,
      catalog.homeBanner,
      catalog.openDetailsPage,
      catalog.selectedActivity,
      catalog.setSelectedActivity,
      loadMallBoxes,
      loadMoreBoxes,
      loadMoreMallBoxes,
      refreshMallCatalog,
      setPageLoading,
      hasMoreBoxes,
      hasMoreMallBoxes,
      loadingMoreBoxes,
      loadingMoreMallBoxes,
      openNewcomerOffer,
    ],
  );

  const catalogSearchSlice = useMemo<MainTabsCatalogSearchSlice>(
    () => ({
      openCatalogSearch: catalog.openCatalogSearch,
      catalogSearchInitialKeyword: catalog.catalogSearchInitialKeyword,
      communityDraft: catalog.communityDraft,
      openCommunityWithDraft: catalog.openCommunityWithDraft,
    }),
    [
      catalog.openCatalogSearch,
      catalog.catalogSearchInitialKeyword,
      catalog.communityDraft,
      catalog.openCommunityWithDraft,
    ],
  );

  return {
    catalog,
    catalogSlice,
    catalogSearchSlice,
    showOnboarding: catalog.showOnboarding,
    dismissOnboarding: catalog.dismissOnboarding,
    loadHomeBannerRef,
    clearHomeBannerOnSessionCleanup: catalog.clearHomeBanner,
  };
}
