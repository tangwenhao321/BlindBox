import type { InfiniteData } from "@tanstack/react-query";
import type { BoxesPageResult, OrdersPageResult } from "./fetchers";
import type { MysteryBox, Order } from "../types";
import { dedupeMysteryBoxes } from "../utils/boxDisplay";

export function flattenBoxPages(data: InfiniteData<BoxesPageResult> | undefined): MysteryBox[] {
  if (!data?.pages.length) return [];
  return dedupeMysteryBoxes(data.pages.flatMap((page) => page.items));
}

export function flattenOrderPages(data: InfiniteData<OrdersPageResult> | undefined): Order[] {
  const merged: Order[] = [];
  const ids = new Set<string>();
  for (const page of data?.pages ?? []) {
    for (const order of page.items) {
      if (ids.has(order.id)) continue;
      ids.add(order.id);
      merged.push(order);
    }
  }
  return merged;
}
