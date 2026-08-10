import type { Order, Product } from "../types";
import { resolvePrizeTier } from "./config";

/** 订单内全部开奖条目（与仓库列表一致，不去重） */
export function listPrizeProductsFromOrder(order: Order): Product[] {
  const rows: Product[] = [];
  for (let itemIndex = 0; itemIndex < (order.items?.length ?? 0); itemIndex++) {
    const item = order.items![itemIndex];
    for (let productIndex = 0; productIndex < (item.products?.length ?? 0); productIndex++) {
      const p = item.products![productIndex];
      const raw = p as Product & { productCover?: string };
      rows.push({
        ...p,
        id: p.id?.trim() || `prize-${order.id}-${item.id ?? itemIndex}-${productIndex}`,
        cover: p.cover ?? raw.productCover,
        qualityType: resolvePrizeTier(p.qualityType),
      });
    }
  }
  return rows;
}

/** 订单约定抽数（各订单行 mysteryBoxCount 之和） */
export function sumOrderDrawCount(order: Order): number {
  return (order.items ?? []).reduce((sum, item) => sum + (item.mysteryBoxCount ?? 0), 0);
}

/** 兼容旧调用：展示用列表与仓库一致 */
export function normalizePrizeProducts(order: Order): Product[] {
  return listPrizeProductsFromOrder(order);
}

