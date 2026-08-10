import { useMemo, useState } from "react";
import { getOrderBoxName, getOrderTimeLabel } from "../order-utils";
import type { Order } from "../types";

export function filterOrders(orders: Order[], statusFilter: string, keyword: string) {
  const filterKey = !statusFilter || statusFilter === "ALL" ? "ALL" : statusFilter;
  const normalizedStatus = filterKey === "COMPLETED" ? "FINISHED" : filterKey;
  const byStatus =
    normalizedStatus === "ALL"
      ? orders
      : orders.filter((order) => {
          const status = order.status === "COMPLETED" ? "FINISHED" : order.status;
          return status === normalizedStatus;
        });
  const sorted =
    normalizedStatus === "ALL"
      ? [...byStatus].sort((a, b) => {
          const ta = new Date(a.createdTime || 0).getTime();
          const tb = new Date(b.createdTime || 0).getTime();
          return tb - ta;
        })
      : byStatus;
  const q = keyword.trim().toLowerCase();
  if (!q) return sorted;
  return sorted.filter((order) => {
    const haystack = [order.id, getOrderBoxName(order), getOrderTimeLabel(order)].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function useOrders(orders: Order[]) {
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderKeyword, setOrderKeyword] = useState("");
  const [autoRefreshOrders, setAutoRefreshOrders] = useState(true);
  const [lastOrderRefreshAt, setLastOrderRefreshAt] = useState(0);

  const filteredOrders = useMemo(() => {
    return filterOrders(orders, orderStatusFilter, orderKeyword);
  }, [orders, orderStatusFilter, orderKeyword]);

  return {
    orderStatusFilter,
    orderKeyword,
    autoRefreshOrders,
    lastOrderRefreshAt,
    filteredOrders,
    setOrderStatusFilter,
    setOrderKeyword,
    setAutoRefreshOrders,
    setLastOrderRefreshAt,
  };
}

