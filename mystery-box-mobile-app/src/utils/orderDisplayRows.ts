import { ORDER_TAB_KEYS } from "../config/orderFilterConfig";
import { ORDER_STATUS } from "../config/constants";
import { getOrderBoxName } from "../order-utils";
import type { Order, Product } from "../types";
import type { WarehouseApiItem } from "../services/warehouseService";

export type OrderDisplayRow = {
  key: string;
  order: Order;
  /** Product name when showing a single prize line instead of the box. */
  productTitle?: string;
  product?: Product;
  shipPending?: boolean;
};

function productFromLine(order: Order, itemIndex: number, product: Product, productIndex: number): OrderDisplayRow {
  const item = order.items?.[itemIndex];
  return {
    key: `${order.id}:${item?.id ?? itemIndex}:${product.id ?? productIndex}`,
    order,
    productTitle: product.name?.trim() || undefined,
    product,
  };
}

/** Paid orders → one row per drawn product; unpaid orders stay as one box row. */
export function expandOrdersToProductRows(orders: Order[]): OrderDisplayRow[] {
  const rows: OrderDisplayRow[] = [];
  for (const order of orders) {
    if (order.status === ORDER_STATUS.TO_BE_PAID) {
      rows.push({ key: order.id, order });
      continue;
    }
    let added = false;
    for (let i = 0; i < (order.items?.length ?? 0); i++) {
      const item = order.items![i];
      for (let j = 0; j < (item.products?.length ?? 0); j++) {
        const product = item.products![j];
        if (!product?.id && !product?.name) continue;
        rows.push(productFromLine(order, i, product, j));
        added = true;
      }
    }
    if (!added) {
      rows.push({ key: order.id, order });
    }
  }
  return rows.sort((a, b) => {
    const ta = new Date(a.order.createdTime || 0).getTime();
    const tb = new Date(b.order.createdTime || 0).getTime();
    return tb - ta;
  });
}

function warehouseItemToRow(item: WarehouseApiItem, options?: { shipPending?: boolean; keyPrefix?: string }): OrderDisplayRow {
  const synthetic: Order = {
    id: item.orderId,
    status: ORDER_STATUS.TO_BE_DELIVERED,
    createdTime: item.createdTime ?? undefined,
    items: [
      {
        id: item.orderItemId,
        mysteryBoxId: item.mysteryBoxId ?? undefined,
        mysteryBoxCount: 1,
        products: [
          {
            id: item.productId,
            name: item.productName,
            cover: item.productCover ?? undefined,
            qualityType: item.qualityType ?? undefined,
          },
        ],
        mysteryBox: item.mysteryBoxName
          ? { id: item.mysteryBoxId ?? item.orderId, name: item.mysteryBoxName, cover: item.mysteryBoxCover ?? undefined }
          : undefined,
      },
    ],
  };
  const prefix = options?.keyPrefix ?? "wh";
  return {
    key: `${prefix}:${item.orderId}:${item.orderItemId}:${item.productId}`,
    order: synthetic,
    productTitle: item.productName?.trim() || undefined,
    product: synthetic.items![0].products![0],
    shipPending: options?.shipPending ?? item.pendingShipRequest === true,
  };
}

/** Current warehouse inventory — one row per product line. */
export function warehouseProductRows(items: WarehouseApiItem[]): OrderDisplayRow[] {
  return items
    .map((item) => warehouseItemToRow(item))
    .sort((a, b) => {
      const ta = new Date(a.order.createdTime || 0).getTime();
      const tb = new Date(b.order.createdTime || 0).getTime();
      return tb - ta;
    });
}

export function warehouseShipPendingRows(items: WarehouseApiItem[]): OrderDisplayRow[] {
  return items
    .filter((item) => item.pendingShipRequest)
    .map((item) => warehouseItemToRow(item, { shipPending: true, keyPrefix: "ship" }));
}

export function filterOrderDisplayRows(
  orders: Order[],
  statusFilter: string,
  keyword: string,
  warehouseItems: WarehouseApiItem[] = [],
): OrderDisplayRow[] {
  const filterKey = !statusFilter || statusFilter === "ALL" ? "ALL" : statusFilter;
  const normalizedStatus = filterKey === "COMPLETED" ? "FINISHED" : filterKey;

  if (normalizedStatus === ORDER_STATUS.TO_BE_DELIVERED) {
    const rows = warehouseShipPendingRows(warehouseItems);
    return applyKeyword(rows, keyword);
  }

  if (normalizedStatus === "ALL") {
    const unpaidRows = orders
      .filter((order) => order.status === ORDER_STATUS.TO_BE_PAID)
      .map((order) => ({ key: `unpaid:${order.id}`, order }));
    const warehouseRows = warehouseProductRows(warehouseItems);
    const rows = [...unpaidRows, ...warehouseRows].sort((a, b) => {
      const ta = new Date(a.order.createdTime || 0).getTime();
      const tb = new Date(b.order.createdTime || 0).getTime();
      return tb - ta;
    });
    return applyKeyword(rows, keyword);
  }

  const byStatus = orders.filter((order) => {
    const status = order.status === "COMPLETED" ? "FINISHED" : order.status;
    return status === normalizedStatus;
  });

  const rows = byStatus.map((order) => ({ key: order.id, order }));

  return applyKeyword(rows, keyword);
}

export function countOrderTabRows(
  orders: Order[],
  statusFilter: string,
  warehouseItems: WarehouseApiItem[] = [],
): number {
  return filterOrderDisplayRows(orders, statusFilter, "", warehouseItems).length;
}

export type OrderTabCounts = Record<string, number>;

type OrderTabCountOptions = {
  /** Warehouse API total when the list is truncated (backend caps at 100). */
  warehouseTotalCount?: number;
};

/** Tab badge counts aligned with `filterOrderDisplayRows` (warehouse + orders). */
export function computeMyOrdersTabCounts(
  orders: Order[],
  warehouseItems: WarehouseApiItem[] = [],
  options?: OrderTabCountOptions,
): OrderTabCounts {
  const counts: OrderTabCounts = {};
  const unpaidCount = orders.filter((order) => order.status === ORDER_STATUS.TO_BE_PAID).length;
  const warehouseTotal = options?.warehouseTotalCount;
  for (const tab of ORDER_TAB_KEYS) {
    if (
      tab.id === "ALL" &&
      warehouseTotal != null &&
      warehouseTotal > warehouseItems.length
    ) {
      counts[tab.id] = unpaidCount + warehouseTotal;
      continue;
    }
    counts[tab.id] = countOrderTabRows(orders, tab.id, warehouseItems);
  }
  return counts;
}

function applyKeyword(rows: OrderDisplayRow[], keyword: string): OrderDisplayRow[] {
  const q = keyword.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => {
    const title = row.productTitle ?? getOrderBoxName(row.order);
    const haystack = [row.order.id, title, row.order.createdTime ?? ""].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}
