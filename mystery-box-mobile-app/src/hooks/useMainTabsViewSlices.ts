import { useMemo } from "react";
import { flushOfflineMutationQueue } from "../offline/offlineMutationQueue";
import {
  useMainTabsAccount,
  useMainTabsAssembledInput,
  useMainTabsAuth,
  useMainTabsCatalog,
  useMainTabsCatalogSearch,
  useMainTabsNav,
  useMainTabsShell,
  useMainTabsWallet,
} from "../context/MainTabsContext";
import { buildBoxViewProps } from "./mainTabs/buildBoxViewProps";
import { buildOrderViewProps } from "./mainTabs/buildOrderViewProps";
import { buildAccountViewProps } from "./mainTabs/buildAccountViewProps";
import { buildActivityDetailProps, buildBalanceLogsViewProps } from "./mainTabs/buildShellSubPageProps";

export function useAssembledMainTabsInput() {
  return useMainTabsAssembledInput();
}

export function useMainTabsBoxViewProps() {
  const input = useAssembledMainTabsInput();
  return useMemo(() => buildBoxViewProps(input), [input]);
}

export function useMainTabsOrderViewProps() {
  const input = useAssembledMainTabsInput();
  return useMemo(() => buildOrderViewProps(input), [input]);
}

export function useMainTabsAccountViewProps() {
  const input = useAssembledMainTabsInput();
  return useMemo(() => buildAccountViewProps(input), [input]);
}

export function useMainTabsBalanceLogsViewProps() {
  const nav = useMainTabsNav();
  const auth = useMainTabsAuth();
  const wallet = useMainTabsWallet();

  return useMemo(
    () =>
      buildBalanceLogsViewProps({
        token: auth.token,
        balanceLogs: wallet.balanceLogs,
        balanceLogsLoading: wallet.balanceLogsLoading,
        balanceLogsLoadError: wallet.balanceLogsLoadError,
        loadBalanceLogs: wallet.loadBalanceLogs,
        goBack: nav.goBack,
      }),
    [auth.token, nav.goBack, wallet],
  );
}

export function useMainTabsActivityDetailProps() {
  const catalog = useMainTabsCatalog();

  return useMemo(
    () =>
      buildActivityDetailProps({
        selectedActivity: catalog.selectedActivity,
        boxes: catalog.boxes,
        mallBoxes: catalog.mallBoxes,
      }),
    [catalog.boxes, catalog.mallBoxes, catalog.selectedActivity],
  );
}

export function useMainTabsShellViewState() {
  const nav = useMainTabsNav();
  const auth = useMainTabsAuth();
  const wallet = useMainTabsWallet();
  const shell = useMainTabsShell();
  const account = useMainTabsAccount();
  const catalog = useMainTabsCatalog();
  const catalogSearch = useMainTabsCatalogSearch();

  return useMemo(
    () => ({
      view: nav.view,
      setView: nav.navigate,
      resetTab: nav.resetTo,
      goBack: nav.goBack,
      isLoggedIn: !!auth.token,
      onOpenLogin: auth.openLoginPage,
      requireAuth: auth.requireAuth,
      userProfile: auth.userProfile,
      balanceAmount: wallet.balance,
      balanceUpdatedAtText: wallet.balanceUpdatedAtText,
      refreshingBalance: wallet.refreshingBalance,
      onRefreshBalance: () => {
        shell.setGlobalErrors([]);
        return wallet.onRefreshBalance((message) => shell.setGlobalErrors([message]));
      },
      onOpenBalanceLogs: () => {
        if (!auth.requireAuth()) return;
        nav.navigate("balanceLogs");
        void wallet.loadBalanceLogs(auth.token);
      },
      pageLoading: shell.pageLoading,
      globalErrors: shell.globalErrors,
      onDismissGlobalError: () => shell.setGlobalErrors([]),
      onRetryFromError: () => {
        void flushOfflineMutationQueue();
        void shell.refreshAllWithLoading(auth.token);
      },
      orderBadges: shell.orderBadges,
      orderTabCounts: shell.orderTabCounts,
      unreadMessageCount: account.unreadMessageCount,
      warehousePendingCount: shell.warehousePendingCount ?? 0,
      warehousePendingCountApproximate: shell.warehousePendingCountApproximate,
      onTabFocus: shell.onTabFocus,
      catalogSearchInitialKeyword: catalogSearch.catalogSearchInitialKeyword,
      communityDraft: catalogSearch.communityDraft,
      openCommunityWithDraft: catalogSearch.openCommunityWithDraft,
      onOpenActivity: (activity: NonNullable<typeof catalog.selectedActivity>) => {
        catalog.setSelectedActivity(activity);
        nav.navigate("activityDetail");
      },
    }),
    [account.unreadMessageCount, auth, catalog, catalogSearch, nav, shell, wallet],
  );
}

export function useProfileTabScreenProps() {
  const shell = useMainTabsShellViewState();
  const orderViewProps = useMainTabsOrderViewProps();
  const { profileViewProps, featureViewProps } = useMainTabsAccountViewProps();

  return useMemo(
    () => ({
      userProfile: shell.userProfile,
      balanceAmount: shell.balanceAmount,
      balanceUpdatedAtText: shell.balanceUpdatedAtText,
      messageBadge: shell.unreadMessageCount ?? 0,
      onRefreshBalance: shell.onRefreshBalance,
      refreshingBalance: shell.refreshingBalance,
      onOpenBalanceLogs: shell.onOpenBalanceLogs,
      orderBadges: shell.orderBadges,
      orderTabCounts: shell.orderTabCounts,
      onFilterOrders: orderViewProps.onFilterByStatus,
      onOpenWarehouse: () => shell.setView("warehouse"),
      onGoHome: () => shell.resetTab("home"),
      onOpenAddressManage: profileViewProps.onOpenAddressManage,
      onOpenMessages: profileViewProps.onOpenMessages,
      onOpenFeedback: profileViewProps.onOpenFeedback,
      onOpenSettings: profileViewProps.onOpenSettings,
      onOpenLogin: profileViewProps.onOpenLogin,
      requireAuth: profileViewProps.requireAuth,
      couponCount: profileViewProps.couponCount,
      onOpenFeature: featureViewProps.onOpenFeature,
      onUpdateNickname: profileViewProps.onUpdateNickname,
      onUpdateAvatar: profileViewProps.onUpdateAvatar,
      onLogout: profileViewProps.onLogout,
      supportPhone: profileViewProps.supportPhone,
    }),
    [featureViewProps.onOpenFeature, orderViewProps.onFilterByStatus, profileViewProps, shell],
  );
}

export function useMainTabsSubPageRouteState() {
  const shellState = useMainTabsShellViewState();
  const boxViewProps = useMainTabsBoxViewProps();
  const orderViewProps = useMainTabsOrderViewProps();
  const accountViewProps = useMainTabsAccountViewProps();
  const balanceLogsViewProps = useMainTabsBalanceLogsViewProps();
  const activityDetailProps = useMainTabsActivityDetailProps();

  return {
    ...shellState,
    boxViewProps,
    orderViewProps,
    balanceLogsViewProps,
    activityDetailProps,
    ...accountViewProps,
  };
}
