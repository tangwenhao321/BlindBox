import { API_BASE_URL, parseError } from "../../api";
import { FEATURE_KEYS } from "../../config/featureRegistry";
import { MOCK_PAYMENT_ENABLED } from "../../config/constants";
import { updateUserInfo } from "../../services/authService";
import { queryMyFeedback, submitFeedback } from "../../services/feedbackService";
import i18n from "../../i18n";
import { toast } from "../../utils/toast";
import type { MainTabsBuildInput } from "../buildAppMainTabsProps";

type AccountSlice = Pick<
  MainTabsBuildInput,
  | "token"
  | "openLoginPage"
  | "requireAuth"
  | "couponCount"
  | "navigate"
  | "refreshBalance"
  | "publicConfig"
  | "openFeaturePage"
  | "goBack"
  | "orders"
  | "unreadMessageCount"
  | "refreshServerNotifications"
  | "setReadNotificationIds"
  | "openOrderDetailsPage"
  | "openDetailsPage"
  | "onLogout"
  | "formRealName"
  | "formPhoneNumber"
  | "formRegion"
  | "formDistrict"
  | "formWard"
  | "formDetails"
  | "formHouseNumber"
  | "formIsDefault"
  | "setFormRealName"
  | "setFormPhoneNumber"
  | "setFormRegion"
  | "setFormDistrict"
  | "setFormWard"
  | "setFormDetails"
  | "setFormHouseNumber"
  | "setFormIsDefault"
  | "editingAddressId"
  | "savingAddress"
  | "saveAddress"
  | "setPendingCheckoutResumeOnBack"
  | "loadAddresses"
>;

export function buildAccountViewProps(input: AccountSlice) {
  const {
    token,
    openLoginPage,
    requireAuth,
    couponCount,
    navigate,
    refreshBalance,
    publicConfig,
    openFeaturePage,
    goBack,
    orders,
    unreadMessageCount,
    refreshServerNotifications,
    setReadNotificationIds,
    openOrderDetailsPage,
    openDetailsPage,
    onLogout,
    formRealName,
    formPhoneNumber,
    formRegion,
    formDistrict,
    formWard,
    formDetails,
    formHouseNumber,
    formIsDefault,
    setFormRealName,
    setFormPhoneNumber,
    setFormRegion,
    setFormDistrict,
    setFormWard,
    setFormDetails,
    setFormHouseNumber,
    setFormIsDefault,
    editingAddressId,
    savingAddress,
    saveAddress,
    setPendingCheckoutResumeOnBack,
  } = input;

  return {
    profileViewProps: {
      isLoggedIn: !!token,
      onOpenLogin: openLoginPage,
      requireAuth,
      couponCount,
      onOpenMessages: () => requireAuth(() => navigate("messages")),
      onOpenFeedback: () => requireAuth(() => navigate("feedback")),
      onOpenSettings: () => requireAuth(() => navigate("settings")),
      onOpenAddressManage: () =>
        requireAuth(() => {
          navigate("addressManage");
          void input.loadAddresses(input.token).catch((error) =>
            toast.error(i18n.t("profileActions.addressLoadFailed", { message: parseError(error) })),
          );
        }),
      onUpdateNickname: async (nickname: string) => {
        await updateUserInfo(token, { nickname });
        await refreshBalance(token);
        toast.success(i18n.t("profileActions.nicknameUpdated"));
      },
      onUpdateAvatar: async (avatar: string) => {
        await updateUserInfo(token, { avatar });
        await refreshBalance(token);
        toast.success(i18n.t("profileActions.avatarUpdated"));
      },
      supportPhone: publicConfig.supportHotline,
      onLogout,
    },
    settingsViewProps: {
      mockPaymentEnabled: MOCK_PAYMENT_ENABLED,
      apiBaseUrl: API_BASE_URL,
      remoteConfigError: publicConfig.loadError,
      onRetryRemoteConfig: () => void publicConfig.reload(),
      onBack: goBack,
      onOpenPrivacy: () => {
        void openFeaturePage(FEATURE_KEYS.PRIVACY);
      },
      onOpenEffectsCenter: () => {
        void openFeaturePage(FEATURE_KEYS.EFFECTS_CENTER);
      },
      onLogout,
    },
    messageViewProps: {
      recentOrders: orders.slice(0, 12),
      couponCount,
      onRefresh: refreshServerNotifications,
      onBack: goBack,
      onOpenOrder: (orderId: string) => {
        void openOrderDetailsPage(orderId);
      },
      onOpenBox: (boxId: string) => {
        void openDetailsPage(boxId);
      },
      onOpenCoupons: () => {
        if (!requireAuth()) return;
        navigate("coupons");
      },
      onOpenMarketplace: () => {
        if (!requireAuth()) return;
        navigate("marketplace");
      },
      onOpenShipRequests: () => {
        if (!requireAuth()) return;
        navigate("shipRequests");
      },
      onMarkedRead: (ids: string[]) => {
        setReadNotificationIds((prev) => new Set([...prev, ...ids]));
        refreshServerNotifications();
      },
    },
    feedbackViewProps: {
      onBack: goBack,
      onSubmit: async (content: string, pictures?: string[]) => {
        await submitFeedback(token, content, pictures);
        toast.success(i18n.t("feedback.submitSuccess"));
      },
      onLoadHistory: () => queryMyFeedback(token),
    },
    featureViewProps: {
      onOpenFeature: (title: string) => {
        void openFeaturePage(title);
      },
    },
    addressFormViewProps: {
      editing: !!editingAddressId,
      realName: formRealName,
      phoneNumber: formPhoneNumber,
      region: formRegion,
      district: formDistrict,
      ward: formWard,
      details: formDetails,
      houseNumber: formHouseNumber,
      isDefault: formIsDefault,
      saving: savingAddress,
      onChangeRealName: setFormRealName,
      onChangePhoneNumber: setFormPhoneNumber,
      onChangeRegion: setFormRegion,
      onChangeDistrict: setFormDistrict,
      onChangeWard: setFormWard,
      onChangeDetails: setFormDetails,
      onChangeHouseNumber: setFormHouseNumber,
      onChangeIsDefault: setFormIsDefault,
      onBack: () => {
        setPendingCheckoutResumeOnBack();
        goBack();
      },
      onSave: () => {
        void saveAddress();
      },
    },
  };
}
