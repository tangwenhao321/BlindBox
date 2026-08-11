import type { HotBox } from "../services/homeService";
import type { MysteryBox, MysteryBoxCategory, Product } from "../types";
import i18n from "../i18n";
import { formatCurrency } from "./formatCurrency";
export { formatMoney } from "./formatCurrency";

/** Keep first occurrence when API or pagination returns duplicate ids. */
export function dedupeById<T extends { id?: string | null }>(list: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    const id = item.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

/** Keep first occurrence when API or pagination returns duplicate box ids. */
export function dedupeMysteryBoxes(list: MysteryBox[]): MysteryBox[] {
  return dedupeById(list);
}

export function dedupeMysteryBoxCategories(list: MysteryBoxCategory[]): MysteryBoxCategory[] {
  return dedupeById(list);
}

export function dedupeHotBoxes(list: HotBox[]): HotBox[] {
  return dedupeById(list);
}

/** Prize thumbs in list cards — product ids are not always unique in API payloads. */
export function uniqueProducts(products: Product[], limit?: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const product of products) {
    const id = product.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(product);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

export function listItemKey(id: string, index: number, prefix = "item") {
  return `${prefix}-${id}-${index}`;
}

export function getBoxValueRange(box: MysteryBox) {
  const prices = (box.products ?? []).map((p) => p.price ?? 0).filter((p) => p > 0);
  if (!prices.length) {
    return { min: box.price, max: Math.max(box.price * 120, box.price + 100) };
  }
  return { min: Math.min(...prices, box.price), max: Math.max(...prices) };
}

/** 展示用幸运币（与现金价近似换算，仅供 UI） */
export function getLuckyCoinAmount(price: number) {
  return Math.round(price * 380);
}

export function getPoolSoldCount(box: MysteryBox) {
  const total = box.poolTotal;
  const remaining = box.poolRemaining;
  if (typeof total === "number" && total > 0 && typeof remaining === "number" && remaining >= 0) {
    return Math.min(total, Math.max(0, total - remaining));
  }
  return null;
}

/** 列表展示用已售文案（优先真实 poolTotal / poolRemaining） */
export function getPoolSoldLabel(box: MysteryBox) {
  const sold = getPoolSoldCount(box);
  if (sold != null) {
    return i18n.t("boxDisplay.poolSold", { count: sold });
  }
  return null;
}

/** @deprecated 使用 getPoolSoldLabel */
export function getPoolRemainingLabel(box: MysteryBox) {
  return getPoolSoldLabel(box);
}

export function getPromoTag(box: MysteryBox) {
  const tip = box.tips?.trim();
  if (tip && tip.length <= 18) return tip;
  if (box.newcomerExclusive) return i18n.t("boxDisplay.promoNewcomer");
  const sold = getPoolSoldCount(box);
  const remaining = box.poolRemaining;
  if (typeof remaining === "number" && remaining > 0 && remaining <= 5) {
    return i18n.t("boxDisplay.promoLowStock", { count: remaining });
  }
  if (sold != null && sold >= 80) {
    return i18n.t("boxDisplay.promoHot", { count: sold });
  }
  if (/保底/.test(`${box.name} ${box.category?.name || ""}`)) return i18n.t("boxDisplay.promoPity");
  if (box.category?.name) return box.category.name;
  if (box.price <= 30) return i18n.t("boxDisplay.promoPriceSurprise", { price: formatCurrency(box.price) });
  return i18n.t("boxDisplay.promoDefault");
}

export function isPitySeriesBox(box: MysteryBox) {
  return /保底|pity/i.test(`${box.name} ${box.tips || ""} ${box.category?.name || ""}`);
}
