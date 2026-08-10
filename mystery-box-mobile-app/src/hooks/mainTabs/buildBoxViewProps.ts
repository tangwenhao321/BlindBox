import type { MainTabsBuildInput } from "../buildAppMainTabsProps";
import { parseError } from "../../api";
import i18n from "../../i18n";
import { dedupeMysteryBoxes } from "../../utils/boxDisplay";
import { hasOpenedBlindBox } from "../../utils/newcomerOffer";
import { toast } from "../../utils/toast";
type BoxSlice = Pick<
  MainTabsBuildInput,
  | "token"
  | "boxes"
  | "mallBoxes"
  | "mallCategoryId"
  | "mallKeyword"
  | "activeBox"
  | "setActiveBox"
  | "addresses"
  | "addressesLoading"
  | "addressesLoadError"
  | "selectedAddressId"
  | "setSelectedAddressId"
  | "creatingOrder"
  | "refreshAllWithLoading"
  | "loadMallBoxes"
  | "loadMoreBoxes"
  | "loadMoreMallBoxes"
  | "refreshMallCatalog"
  | "setPageLoading"
  | "hasMoreBoxes"
  | "hasMoreMallBoxes"
  | "loadingMoreBoxes"
  | "loadingMoreMallBoxes"
  | "handleMallCategoryChange"
  | "handleMallSearch"
  | "homeBanner"
  | "openDetailsPage"
  | "openAddressFormPage"
  | "quote"
  | "quotingPrice"
  | "quoteError"
  | "openLoginPage"
  | "goBack"
  | "availableCoupons"
  | "selectedCouponUserId"
  | "setSelectedCouponUserId"
  | "openAddressForm"
  | "loadAddresses"
  | "onSetDefaultAddress"
  | "onDeleteAddress"
  | "drawCount"
  | "setDrawCount"
  | "createOrder"
  | "pendingCheckoutResume"
  | "setPendingCheckoutResume"
  | "spendLimitRefreshKey"
  | "navigate"
  | "openCatalogSearch"
  | "orders"
  | "ordersReady"
  | "boxesLoadError"
  | "mallLoadError"
  | "openNewcomerOffer"
>;
export function buildBoxViewProps(input: BoxSlice) {
  const {
    token,
    boxes,
    mallBoxes,
    mallCategoryId,
    mallKeyword,
    activeBox,
    setActiveBox,
    addresses,
    addressesLoading,
    addressesLoadError,
    selectedAddressId,
    setSelectedAddressId,
    creatingOrder,
    refreshAllWithLoading,
    loadMallBoxes,
    loadMoreBoxes,
    loadMoreMallBoxes,
    refreshMallCatalog,
    setPageLoading,
    hasMoreBoxes,
    hasMoreMallBoxes,
    loadingMoreBoxes,
    loadingMoreMallBoxes,
    handleMallCategoryChange,
    handleMallSearch,
    homeBanner,
    openDetailsPage,
    openAddressFormPage,
    quote,
    quotingPrice,
    quoteError,
    openLoginPage,
    goBack,
    availableCoupons,
    selectedCouponUserId,
    setSelectedCouponUserId,
    openAddressForm,
    loadAddresses,
    onSetDefaultAddress,
    onDeleteAddress,
    drawCount,
    setDrawCount,
    createOrder,
    pendingCheckoutResume,
    setPendingCheckoutResume,
    spendLimitRefreshKey,
    navigate,
    openCatalogSearch,
    orders,
    ordersReady,
    boxesLoadError,
    mallLoadError,
    openNewcomerOffer,
  } = input;

  const hasNewcomerBox = boxes.some((b) => b.newcomerExclusive);
  const showNewcomerPromo = ordersReady && hasNewcomerBox && !hasOpenedBlindBox(orders);

  return {
    boxes,
    mallBoxes,
    mallCategoryId,
    mallKeyword,
    activeBox,
    addresses,
    addressesLoading,
    addressesLoadError,
    selectedAddressId,
    creatingOrder,
    onRefreshAll: () => {
      void refreshAllWithLoading(token);
    },
    onRefreshMall: () => {
      setPageLoading(true);
      void refreshMallCatalog(token).finally(() => setPageLoading(false));
    },
    onLoadMore: () => loadMoreBoxes(token),
    onLoadMoreMall: () => loadMoreMallBoxes(token),
    hasMoreBoxes,
    hasMoreMallBoxes,
    loadingMoreBoxes,
    loadingMoreMallBoxes,
    onMallCategoryChange: handleMallCategoryChange,
    onMallSearch: handleMallSearch,
    catalogBoxes: dedupeMysteryBoxes([...boxes, ...mallBoxes]),
    onOpenDetails: openDetailsPage,
    bannerUri: homeBanner.uri,
    bannerTitle: homeBanner.title,
    bannerSubtitle: homeBanner.subtitle,
    showNewcomerBar: showNewcomerPromo,
    onNewcomerPress: () => {
      openNewcomerOffer?.();
    },
    onOpenAddressFormPage: openAddressFormPage,
    quotePayAmount: quote?.payAmount ?? null,
    quoteProductAmount: quote?.productAmount ?? null,
    quoteDeliveryFee: quote?.deliveryFee ?? 0,
    quoteCouponAmount: quote?.couponAmount ?? 0,
    quoteRetentionDiscount: quote?.retentionDiscount ?? 0,
    quoteSavingsAmount: quote?.savingsAmount ?? 0,
    suggestedCouponApplied: Boolean(
      quote?.suggestedCouponUserId && selectedCouponUserId === quote.suggestedCouponUserId,
    ),
    quotingPrice,
    quoteError,
    isLoggedIn: !!token,
    onRequireLogin: openLoginPage,
    onBackBoxList: () => {
      setActiveBox(null);
      goBack();
    },
    availableCoupons,
    selectedCouponUserId,
    onSelectCoupon: setSelectedCouponUserId,
    onOpenAddressModal: () => openAddressForm(),
    onOpenAddressManage: () => {
      navigate("addressManage");
      void loadAddresses(token).catch((error) =>
        toast.error(i18n.t("profileActions.addressLoadFailed", { message: parseError(error) })),
      );
    },
    onEditAddress: openAddressFormPage,
    onRefreshAddresses: () => {
      void loadAddresses(token).catch((error) =>
        toast.error(i18n.t("profileActions.addressLoadFailed", { message: parseError(error) })),
      );
    },
    onSelectAddress: setSelectedAddressId,
    onSetDefaultAddress,
    onDeleteAddress,
    drawCount,
    onChangeDrawCount: setDrawCount,
    onCreateOrder: createOrder,
    onOpenProbability: () => {
      if (activeBox) navigate("probability");
    },
    onOpenLeaderboard: () => navigate("leaderboard"),
    onOpenCatalogSearch: openCatalogSearch,
    onOpenPlayGuide: () => navigate("playGuide"),
    onOpenProbabilityDisclosure: () => {
      const target = boxes[0] ?? mallBoxes[0];
      if (!target) {
        toast.info(i18n.t("catalog.noBoxes"));
        return;
      }
      setActiveBox(target);
      navigate("probability");
    },
    resumeConfirmCheckout: pendingCheckoutResume,
    onResumeConfirmHandled: () => setPendingCheckoutResume(false),
    spendLimitRefreshKey,
    boxesLoadError,
    mallLoadError,
    skipOnboardingCoach: ordersReady && hasOpenedBlindBox(orders),
  };
}
