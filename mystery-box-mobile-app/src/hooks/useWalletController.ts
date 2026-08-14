import { useCallback, useMemo } from "react";
import type { TabKey } from "../components/ui/BottomTabBar";
import type { AppView } from "../components/mainTabs/appViews";
import type { Order } from "../types";
import { useAppAccountOrchestration } from "./useAppAccountOrchestration";
import type {
  MainTabsAccountSlice,
  MainTabsWalletSlice,
} from "./mainTabsSliceTypes";

export type WalletControllerInput = {
  token: string;
  loading: boolean;
  orders: Order[];
  ordersReady: boolean;
  navigate: (view: AppView) => void;
};

export type WalletControllerResult = {
  account: ReturnType<typeof useAppAccountOrchestration>;
  walletSlice: MainTabsWalletSlice;
  accountSlice: MainTabsAccountSlice;
  onTabFocusWallet: (tab: TabKey) => void;
};

export function useWalletController({ token, loading, orders, ordersReady, navigate }: WalletControllerInput): WalletControllerResult {
  const account = useAppAccountOrchestration({ token, loading, orders, ordersReady, navigate });
  const { wallet, newcomer: _newcomer, publicConfig, openFeaturePage, unreadMessageCount, refreshServerNotifications, setReadNotificationIds } =
    account;

  const walletSlice = useMemo<MainTabsWalletSlice>(
    () => ({
      balance: wallet.balance,
      balanceUpdatedAtText: wallet.balanceUpdatedAtText,
      onRefreshBalance: wallet.onRefreshBalance,
      refreshingBalance: wallet.refreshingBalance,
      loadBalanceLogs: wallet.loadBalanceLogs,
      balanceLogs: wallet.balanceLogs,
      balanceLogsLoading: wallet.balanceLogsLoading,
      balanceLogsLoadError: wallet.balanceLogsLoadError,
      refreshBalance: wallet.refreshBalance,
    }),
    [
      wallet.balance,
      wallet.balanceUpdatedAtText,
      wallet.onRefreshBalance,
      wallet.refreshingBalance,
      wallet.loadBalanceLogs,
      wallet.balanceLogs,
      wallet.balanceLogsLoading,
      wallet.balanceLogsLoadError,
      wallet.refreshBalance,
    ],
  );

  const accountSlice = useMemo<MainTabsAccountSlice>(
    () => ({
      couponCount: wallet.couponCount,
      publicConfig,
      openFeaturePage,
      unreadMessageCount,
      refreshServerNotifications,
      setReadNotificationIds,
    }),
    [wallet.couponCount, publicConfig, openFeaturePage, unreadMessageCount, refreshServerNotifications, setReadNotificationIds],
  );

  const onTabFocusWallet = useCallback(
    (tab: TabKey) => {
      if (tab === "profile") void refreshServerNotifications();
    },
    [refreshServerNotifications],
  );

  return {
    account,
    walletSlice,
    accountSlice,
    onTabFocusWallet,
  };
}
