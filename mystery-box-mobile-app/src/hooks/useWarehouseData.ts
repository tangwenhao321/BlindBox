import { useCallback, useEffect, useMemo, useState } from "react";
import { ORDER_STATUS } from "../config/constants";
import i18n from "../i18n";
import { parseError } from "../api";
import { fetchFragmentBalance } from "../services/fragmentService";
import { fetchWarehouseItemCount, fetchWarehouseItems, type WarehouseListResult } from "../services/warehouseService";
import {
  fetchMyWarehouseShipRequests,
  type ShipRequestSummary,
} from "../services/warehouseShipService";
import { toast } from "../utils/toast";
import type { Order } from "../types";

export type WarehouseItem = {
  id: string;
  name: string;
  orderId: string;
  orderItemId?: string;
  productId?: string;
  status: string;
  tier?: string;
  source?: string;
  pendingShip?: boolean;
  productCover?: string | null;
  mysteryBoxCover?: string | null;
  prizeCount?: number;
};

export const WAREHOUSE_PAGE_SIZE = 40;

const PENDING_STATUSES = new Set<string>([
  ORDER_STATUS.TO_BE_DELIVERED,
  ORDER_STATUS.TO_BE_RECEIVED,
  "MARKETPLACE",
]);

function canShipItem(item: WarehouseItem) {
  if (item.pendingShip) return false;
  return item.status === ORDER_STATUS.TO_BE_DELIVERED || item.status === "MARKETPLACE";
}

function collectProducts(orders: Order[], mode: "product" | "box"): WarehouseItem[] {
  const items: WarehouseItem[] = [];
  for (const order of orders) {
    const eligible =
      order.status === ORDER_STATUS.TO_BE_DELIVERED ||
      order.status === ORDER_STATUS.TO_BE_RECEIVED ||
      order.status === ORDER_STATUS.FINISHED ||
      order.status === ORDER_STATUS.COMPLETED;
    if (!eligible) continue;
    for (const line of order.items ?? []) {
      if (mode === "box") {
        items.push({
          id: `${order.id}-box`,
          name: line.mysteryBox?.name || i18n.t("warehouse.fallbackBox"),
          orderId: order.id,
          status: order.status,
        });
        break;
      }
      for (const product of line.products ?? []) {
        items.push({
          id: `${order.id}-${product.id || product.name}`,
          name: product.name || i18n.t("warehouse.fallbackPrize"),
          orderId: order.id,
          orderItemId: line.id,
          productId: product.id,
          status: order.status,
          tier: product.qualityType,
        });
      }
    }
  }
  return items;
}

function warehouseLineId(
  row: WarehouseListResult["items"][number],
  index: number,
) {
  const orderItemId = row.orderItemId?.trim() || `idx-${index}`;
  const listing = row.listingId?.trim() || "order";
  return `${row.orderId}|${orderItemId}|${row.productId}|${listing}`;
}

function dedupeWarehouseItems(items: WarehouseItem[]): WarehouseItem[] {
  const seen = new Set<string>();
  const out: WarehouseItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function mapApiItems(
  rows: WarehouseListResult["items"],
  mode: "product" | "box",
): WarehouseItem[] {
  if (mode === "box") {
    const seen = new Set<string>();
    return rows
      .filter((r) => r.source === "ORDER")
      .filter((r) => {
        if (seen.has(r.orderId)) return false;
        seen.add(r.orderId);
        return true;
      })
      .map((r) => ({
        id: `${r.orderId}-box`,
        name: r.mysteryBoxName?.trim() || i18n.t("warehouse.fallbackBoxOrder"),
        orderId: r.orderId,
        status: r.orderStatus,
        mysteryBoxCover: r.mysteryBoxCover,
        prizeCount: r.prizeCount ?? undefined,
      }));
  }
  return rows.map((r, index) => ({
    id: warehouseLineId(r, index),
    name: r.productName?.trim() || i18n.t("warehouse.fallbackPrize"),
    orderId: r.orderId,
    orderItemId: r.orderItemId,
    productId: r.productId,
    status: r.orderStatus,
    tier: r.qualityType || undefined,
    source: r.source,
    pendingShip: r.pendingShipRequest,
    productCover: r.productCover,
  }));
}

function filterPendingItems(items: WarehouseItem[]) {
  return items.filter((item) => PENDING_STATUSES.has(item.status));
}

type Params = {
  isActive?: boolean;
  authToken?: string;
  orders: Order[];
};

export function useWarehouseData({ isActive = false, authToken, orders }: Params) {
  const [mainTab, setMainTab] = useState<"product" | "box">("product");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [apiItems, setApiItems] = useState<WarehouseItem[]>([]);
  const [warehouseOffset, setWarehouseOffset] = useState(0);
  const [warehouseHasMore, setWarehouseHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [shipRequests, setShipRequests] = useState<ShipRequestSummary[]>([]);
  const [fragmentBalance, setFragmentBalance] = useState<number | null>(null);
  const [fragmentBalanceError, setFragmentBalanceError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [countApproximate, setCountApproximate] = useState(false);
  const [listApproximate, setListApproximate] = useState(false);

  const reloadApi = useCallback(async () => {
    if (!authToken) return;
    setApiLoading(true);
    setApiError(null);
    try {
      const listResult = await fetchWarehouseItems(authToken, pendingOnly, WAREHOUSE_PAGE_SIZE, 0);
      setApiItems(dedupeWarehouseItems(mapApiItems(listResult.items, mainTab)));
      setListApproximate(listResult.approximate === true);
      setWarehouseOffset(listResult.items.length);
      setWarehouseHasMore(listResult.items.length >= WAREHOUSE_PAGE_SIZE);
      const countResult = await fetchWarehouseItemCount(authToken, pendingOnly);
      setTotalCount(countResult.count);
      setCountApproximate(countResult.approximate === true);
    } catch (error) {
      setApiItems([]);
      setWarehouseHasMore(false);
      const message = parseError(error);
      setApiError(message);
      toast.error(message);
    } finally {
      setApiLoading(false);
    }
  }, [authToken, mainTab, pendingOnly]);

  const loadMoreWarehouse = useCallback(async () => {
    if (!authToken || loadingMore || !warehouseHasMore) return;
    setLoadingMore(true);
    try {
      const listResult = await fetchWarehouseItems(
        authToken,
        pendingOnly,
        WAREHOUSE_PAGE_SIZE,
        warehouseOffset,
      );
      setApiItems((prev) => dedupeWarehouseItems([...prev, ...mapApiItems(listResult.items, mainTab)]));
      if (listResult.approximate) setListApproximate(true);
      setWarehouseOffset((prev) => prev + listResult.items.length);
      setWarehouseHasMore(listResult.items.length >= WAREHOUSE_PAGE_SIZE);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setLoadingMore(false);
    }
  }, [authToken, loadingMore, mainTab, pendingOnly, warehouseHasMore, warehouseOffset]);

  const orderProductFingerprint = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          (order.items?.reduce((lineSum, line) => lineSum + (line.products?.length ?? 0), 0) ?? 0),
        0,
      ),
    [orders],
  );

  useEffect(() => {
    if (authToken) void reloadApi();
  }, [authToken, mainTab, pendingOnly, orderProductFingerprint, reloadApi]);

  const reloadShipRequests = useCallback(async () => {
    if (!authToken) {
      setShipRequests([]);
      return;
    }
    try {
      setShipRequests(await fetchMyWarehouseShipRequests(authToken, 8));
    } catch {
      setShipRequests([]);
    }
  }, [authToken]);

  useEffect(() => {
    void reloadShipRequests();
  }, [reloadShipRequests]);

  useEffect(() => {
    if (isActive && authToken) {
      void reloadApi();
      void reloadShipRequests();
    }
  }, [authToken, isActive, reloadApi, reloadShipRequests]);

  const reloadFragmentBalance = useCallback(() => {
    if (!authToken) {
      setFragmentBalance(null);
      setFragmentBalanceError(null);
      return;
    }
    setFragmentBalanceError(null);
    void fetchFragmentBalance(authToken)
      .then((balance) => setFragmentBalance(balance))
      .catch((error) => {
        setFragmentBalance(null);
        setFragmentBalanceError(parseError(error));
      });
  }, [authToken]);

  useEffect(() => {
    if (!isActive) return;
    reloadFragmentBalance();
  }, [isActive, orderProductFingerprint, reloadFragmentBalance]);

  const orderItems = useMemo(() => collectProducts(orders, mainTab), [mainTab, orders]);
  const allItems = authToken ? apiItems : orderItems;
  const items = useMemo(() => {
    if (authToken || !pendingOnly) return allItems;
    return filterPendingItems(allItems);
  }, [allItems, authToken, pendingOnly]);

  const shippableItems = useMemo(() => items.filter(canShipItem), [items]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const setMainTabAndReset = useCallback((tab: "product" | "box") => {
    exitSelectMode();
    setMainTab(tab);
  }, [exitSelectMode]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllShippable = useCallback(() => {
    setSelectedIds(new Set(shippableItems.filter((i) => i.productId).map((i) => i.id)));
  }, [shippableItems]);

  return {
    mainTab,
    setMainTab: setMainTabAndReset,
    pendingOnly,
    setPendingOnly,
    items,
    shippableItems,
    apiError,
    apiLoading,
    loadingMore,
    shipRequests,
    fragmentBalance,
    fragmentBalanceError,
    reloadApi,
    reloadShipRequests,
    reloadFragmentBalance,
    loadMoreWarehouse,
    selectMode,
    setSelectMode,
    selectedIds,
    toggleSelect,
    selectAllShippable,
    exitSelectMode,
    totalCount: authToken ? totalCount ?? items.length : items.length,
    countApproximate: countApproximate || listApproximate,
    listApproximate,
  };
}
