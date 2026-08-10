import { useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import { useAppHomeBanner } from "./useAppHomeBanner";
import { useAppCatalogFlow } from "./useAppCatalogFlow";
import { useAppCatalogSearch } from "./useAppCatalogSearch";
import { useAppCommunityDraft } from "./useAppCommunityDraft";
import type { MysteryBox, Order } from "../types";
import type { MysteryBoxActivity } from "../services/activityService";

export type AppCatalogOrchestrationInput = {
  token: string;
  view: AppView;
  loading: boolean;
  boxesCount: number;
  mallBoxesCount: number;
  navigate: (view: AppView) => void;
  setPageLoading: (value: boolean) => void;
  loadMallBoxes: (token: string, categoryId?: string, page?: number, keyword?: string) => Promise<void>;
  openDetails: (boxId: string) => Promise<unknown>;
  resetCouponSelection: () => void;
  loadAvailableCoupons: () => Promise<void>;
  refreshAllWithLoading: (
    usingToken?: string,
    options?: { includeHeavy?: boolean; includeMall?: boolean },
  ) => Promise<void>;
  orders: Order[];
  ordersReady: boolean;
};

export function useAppCatalogOrchestration(input: AppCatalogOrchestrationInput) {
  const {
    token,
    view,
    loading,
    boxesCount,
    mallBoxesCount,
    navigate,
    setPageLoading,
    loadMallBoxes,
    openDetails,
    resetCouponSelection,
    loadAvailableCoupons,
    refreshAllWithLoading,
    orders,
    ordersReady,
  } = input;

  const [activeBox, setActiveBox] = useState<MysteryBox | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<MysteryBoxActivity | null>(null);
  const { homeBanner, loadHomeBanner, clearHomeBanner } = useAppHomeBanner(token);
  const { catalogSearchInitialKeyword, openCatalogSearch } = useAppCatalogSearch(navigate);
  const { communityDraft, openCommunityWithDraft } = useAppCommunityDraft(navigate);

  const { showOnboarding, dismissOnboarding, openDetailsPage, handleMallSearch, handleMallCategoryChange } =
    useAppCatalogFlow({
      token,
      view,
      loading,
      boxesCount,
      mallBoxesCount,
      navigate,
      setPageLoading,
      loadMallBoxes,
      openDetails,
      activeBox,
      resetCouponSelection,
      loadAvailableCoupons,
      refreshAllWithLoading,
      orders,
      ordersReady,
    });

  return {
    activeBox,
    setActiveBox,
    selectedActivity,
    setSelectedActivity,
    homeBanner,
    loadHomeBanner,
    clearHomeBanner,
    catalogSearchInitialKeyword,
    openCatalogSearch,
    communityDraft,
    openCommunityWithDraft,
    showOnboarding,
    dismissOnboarding,
    openDetailsPage,
    handleMallSearch,
    handleMallCategoryChange,
  };
}
