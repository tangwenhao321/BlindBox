import type { Product } from "../types";
import { uniqueProducts } from "./boxDisplay";
import { normalizeQualityTier } from "./quality";

export type ProductTierKey = "LEGEND" | "EPIC" | "ADVANCED";

export function productTierGroup(product: Product): ProductTierKey {
  const tier = normalizeQualityTier(product.qualityType);
  if (tier === "LEGENDARY" || tier === "LEGEND") return "LEGEND";
  if (tier === "EPIC") return "EPIC";
  return "ADVANCED";
}

export function sortProductsForCarousel(products: Product[], activeBox: { id: string; name: string; price: number }): Product[] {
  const order = { LEGEND: 0, EPIC: 1, ADVANCED: 2 };
  const sorted = uniqueProducts([...products].sort((a, b) => order[productTierGroup(a)] - order[productTierGroup(b)]));
  return sorted.length ? sorted : [{ id: activeBox.id, name: activeBox.name, price: activeBox.price } as Product];
}
