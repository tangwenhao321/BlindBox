import { parseError } from "../../api";
import { decomposeOrderItem } from "../../services/fragmentService";
import { redeemOrderItemToBalance } from "../../services/orderService";
import { formatCurrency } from "../../utils/formatCurrency";
import { toast } from "../../utils/toast";
import { queueIfOffline } from "../../utils/offlineSubmitGuard";
import i18n from "../../i18n";
import type { MainTabsBuildInput } from "../buildAppMainTabsProps";

type OrderSlice = Pick<
  MainTabsBuildInput,
  | "token"
  | "selectedOrder"
  | "setSelectedOrder"
  | "orders"
  | "loadOrders"
  | "loadOrdersDebounced"
  | "loadMoreOrders"
  | "hasMoreOrders"
  | "loadingMoreOrders"
  | "requestPayment"
  | "openOrderDetailsPage"
  | "refreshOrderDetails"
  | "cancelUnpaidOrder"
  | "redeemToBalance"
  | "confirmReceive"
  | "isUnpaidOrder"
  | "orderStatusFilter"
  | "autoRefreshOrders"
  | "orderKeyword"
  | "setOrderStatusFilter"
  | "setAutoRefreshOrders"
  | "setOrderKeyword"
  | "searchedOrders"
  | "onFilterByStatus"
  | "ordersLoadError"
  | "goBack"
>;

export function buildOrderViewProps(input: OrderSlice) {
  const {
    token,
    selectedOrder,
    setSelectedOrder,
    orders,
    loadOrders,
    loadOrdersDebounced,
    loadMoreOrders,
    hasMoreOrders,
    loadingMoreOrders,
    requestPayment,
    openOrderDetailsPage,
    refreshOrderDetails,
    cancelUnpaidOrder,
    redeemToBalance,
    confirmReceive,
    isUnpaidOrder,
    orderStatusFilter,
    autoRefreshOrders,
    orderKeyword,
    setOrderStatusFilter,
    setAutoRefreshOrders,
    setOrderKeyword,
    searchedOrders,
    onFilterByStatus,
    ordersLoadError,
    goBack,
  } = input;

  return {
    selectedOrder,
    orders,
    onRedeemOrderItem: async (orderItemId: string, productId: string) => {
      if (!token) return;
      try {
        const amount = await redeemOrderItemToBalance(token, orderItemId, productId);
        await loadOrders(token);
        toast.success(i18n.t("orders.redeemItemSuccess", { amount: formatCurrency(amount) }));
      } catch (error) {
        toast.error(parseError(error));
        throw error;
      }
    },
    onDecomposeOrderItem: async (orderItemId: string, productId: string) => {
      if (!token) return;
      const perform = async () => {
        await decomposeOrderItem(token, orderItemId, productId);
        await loadOrders(token);
        toast.success(i18n.t("orders.decomposeSuccess"));
      };
      if (
        queueIfOffline("offline.actionDecompose", perform, {
          kind: "decomposeOrderItem",
          token,
          payload: { orderItemId, productId },
        })
      )
        return;
      try {
        await perform();
      } catch (error) {
        toast.error(parseError(error));
        throw error;
      }
    },
    onBackOrderList: () => {
      setSelectedOrder(null);
      goBack();
    },
    onPay: requestPayment,
    onRefreshOrderDetails: async () => {
      if (!selectedOrder) return;
      await loadOrders(token);
      await refreshOrderDetails(selectedOrder.id);
    },
    onCancelUnpaidOrder: cancelUnpaidOrder,
    onRedeemToBalance: redeemToBalance,
    onConfirmReceive: confirmReceive,
    isUnpaidOrder,
    orderStatusFilter,
    autoRefreshOrders,
    orderKeyword,
    setOrderStatusFilter,
    setAutoRefreshOrders,
    setOrderKeyword,
    searchedOrders,
    onRefreshOrders: () => loadOrdersDebounced(token),
    onLoadMoreOrders: () => loadMoreOrders(token),
    hasMoreOrders,
    loadingMoreOrders,
    onOpenOrderDetails: openOrderDetailsPage,
    onFilterByStatus,
    ordersLoadError,
    onRetryOrders: () => {
      void loadOrders(token).catch((error) =>
        toast.error(i18n.t("orders.loadFailed", { message: parseError(error) })),
      );
    },
  };
}
