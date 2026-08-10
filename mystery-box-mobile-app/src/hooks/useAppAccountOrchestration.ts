import { useEffect, useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import { useUserWallet } from "./useUserWallet";
import { useNewcomerOffer } from "./useNewcomerOffer";
import { useAppPublicConfig } from "./useAppPublicConfig";
import { useFeatureNavigation } from "./useFeatureNavigation";
import { useMessageUnread } from "./useMessageUnread";
import { useWarehousePendingBadge } from "./useWarehousePendingBadge";
import { loadReadNotificationIds } from "../utils/notificationRead";
import type { Order } from "../types";

export type AppAccountOrchestrationInput = {
  token: string;
  loading: boolean;
  orders: Order[];
  ordersReady: boolean;
  navigate: (view: AppView) => void;
};

export function useAppAccountOrchestration({ token, loading, orders, ordersReady, navigate }: AppAccountOrchestrationInput) {
  const wallet = useUserWallet(token);
  const newcomer = useNewcomerOffer(orders, !loading && !!token, ordersReady);
  const publicConfig = useAppPublicConfig();
  const { openFeaturePage } = useFeatureNavigation({
    token,
    setView: navigate,
    supportPhone: publicConfig.supportHotline,
    enterpriseWechat: publicConfig.enterpriseWechat,
    featureFlags: publicConfig.featureFlags,
  });

  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadReadNotificationIds().then(setReadNotificationIds);
  }, []);

  const { unreadMessageCount, refreshServerNotifications } = useMessageUnread({
    token,
    orders,
    couponCount: wallet.couponCount,
    readNotificationIds,
  });

  const warehouseBadgeRefreshKey = orders.reduce(
    (sum, order) =>
      sum +
      (order.items?.reduce((lineSum, line) => lineSum + (line.products?.length ?? 0), 0) ?? 0),
    0,
  );
  const { warehousePendingCount, warehousePendingCountApproximate, refreshWarehouseBadge } = useWarehousePendingBadge(
    token,
    warehouseBadgeRefreshKey,
  );

  return {
    wallet,
    newcomer,
    publicConfig,
    openFeaturePage,
    readNotificationIds,
    setReadNotificationIds,
    unreadMessageCount,
    refreshServerNotifications,
    warehousePendingCount,
    warehousePendingCountApproximate,
    refreshWarehouseBadge,
  };
}
