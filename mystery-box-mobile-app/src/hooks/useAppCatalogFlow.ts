import { useCallback, useEffect, useState } from "react";

import { parseError } from "../api";

import i18n from "../i18n";

import { markOnboardingDone, shouldShowOnboarding } from "../components/OnboardingOverlay";

import { hasOpenedBlindBox, hasUserPurchasedLocally } from "../utils/newcomerOffer";

import { toast } from "../utils/toast";

import type { Order } from "../types";

import type { AppView } from "../components/mainTabs/appViews";
import type { NavigateOptions } from "./useAppNavigation";



type Params = {

  token: string;

  view: AppView;

  loading: boolean;

  boxesCount: number;

  mallBoxesCount: number;

  navigate: (view: AppView, options?: NavigateOptions) => void;

  setPageLoading: (value: boolean) => void;

  loadMallBoxes: (token: string, categoryId?: string, page?: number, keyword?: string) => Promise<void>;

  openDetails: (id: string) => Promise<unknown>;

  activeBox: import("../types").MysteryBox | null;

  resetCouponSelection: () => void;

  loadAvailableCoupons: () => Promise<void>;

  refreshAllWithLoading: (

    token: string,

    options?: { includeHeavy?: boolean; includeMall?: boolean },

  ) => Promise<void>;

  orders: Order[];

  ordersReady: boolean;

};



export function useAppCatalogFlow(params: Params) {

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

    activeBox,

    resetCouponSelection,

    loadAvailableCoupons,

    refreshAllWithLoading,

    orders,

    ordersReady,

  } = params;



  const [showOnboarding, setShowOnboarding] = useState(false);



  useEffect(() => {

    if (!token || view !== "mall" || mallBoxesCount > 0) return;

    setPageLoading(true);

    void loadMallBoxes(token, undefined, 1)

      .catch((error) => toast.error(i18n.t("catalog.mallLoadFailed", { message: parseError(error) })))

      .finally(() => setPageLoading(false));

  }, [token, view, mallBoxesCount, loadMallBoxes, setPageLoading]);



  useEffect(() => {

    if (loading) return;

    if (!token && boxesCount === 0) {

      void refreshAllWithLoading("", { includeHeavy: false, includeMall: true }).catch((error) => {

        toast.error(i18n.t("catalog.homeLoadFailed", { message: parseError(error) }));

      });

    }

  }, [loading, token, boxesCount, refreshAllWithLoading]);

  useEffect(() => {
    if (loading || !token) {
      setShowOnboarding(false);
      return;
    }
    if (!ordersReady) return;
    void (async () => {
      if (await hasUserPurchasedLocally()) {
        setShowOnboarding(false);
        return;
      }
      if (hasOpenedBlindBox(orders)) {
        await markOnboardingDone();
        setShowOnboarding(false);
        return;
      }
      const show = await shouldShowOnboarding();
      setShowOnboarding(show);
    })();
  }, [loading, token, orders, ordersReady]);

  const handleMallSearch = useCallback(

    (keyword: string) => {

      const trimmed = keyword.trim();

      setPageLoading(true);

      void loadMallBoxes(token, undefined, 1, trimmed || undefined).finally(() => setPageLoading(false));

    },

    [loadMallBoxes, setPageLoading, token],

  );



  const handleMallCategoryChange = useCallback(

    (categoryId?: string) => {

      setPageLoading(true);

      void loadMallBoxes(token, categoryId, 1, undefined).finally(() => setPageLoading(false));

    },

    [loadMallBoxes, setPageLoading, token],

  );



  const openDetailsPage = useCallback(

    async (id: string) => {

      const needsLoad = activeBox?.id !== id;

      if (needsLoad) {

        const box = await openDetails(id);

        if (!box) return;

      }

      resetCouponSelection();

      if (token) await loadAvailableCoupons();

      navigate("boxDetails", { boxId: id });

    },

    [activeBox?.id, loadAvailableCoupons, navigate, openDetails, resetCouponSelection, token],

  );



  return {

    showOnboarding,

    dismissOnboarding: () => {

      void markOnboardingDone();

      setShowOnboarding(false);

    },

    openDetailsPage,

    handleMallSearch,

    handleMallCategoryChange,

  };

}

