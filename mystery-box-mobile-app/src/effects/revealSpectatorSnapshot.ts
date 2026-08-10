import type { Product } from "../types";

export type SpectatorSnapshot = Record<string, unknown>;

export function parseSpectatorProducts(snapshot: SpectatorSnapshot): Product[] {
  const raw = snapshot.products;
  if (!Array.isArray(raw)) return [];
  const out: Product[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : undefined;
    const name = typeof row.name === "string" ? row.name : undefined;
    if (!id || !name) continue;
    const product: Product = { id, name, price: 0 };
    if (typeof row.qualityType === "string") {
      product.qualityType = row.qualityType;
    }
    out.push(product);
  }
  return out;
}

export function parseSpectatorSnapshot(snapshot: SpectatorSnapshot): {
  products: Product[];
  total: number;
  revealIndex: number;
} {
  const products = parseSpectatorProducts(snapshot);
  const productId = typeof snapshot.productId === "string" ? snapshot.productId : undefined;
  const productName = typeof snapshot.productName === "string" ? snapshot.productName : undefined;
  const qualityType = typeof snapshot.qualityType === "string" ? snapshot.qualityType : undefined;
  const legacyProduct =
    productId && productName ? { id: productId, name: productName, price: 0, qualityType } satisfies Product : null;
  const total =
    typeof snapshot.total === "number"
      ? snapshot.total
      : products.length > 0
        ? products.length
        : 1;
  const revealIndex = typeof snapshot.revealIndex === "number" ? snapshot.revealIndex : 0;
  const merged = products.length > 0 ? products : legacyProduct ? [legacyProduct] : [];
  return { products: merged, total, revealIndex };
}

export function buildLiveSpectatorSnapshot(input: {
  revealIndex: number;
  total: number;
  products: Product[];
  current?: Product | null;
}): SpectatorSnapshot {
  const current = input.current ?? input.products[input.revealIndex];
  return {
    revealIndex: input.revealIndex,
    total: input.total,
    productId: current?.id,
    productName: current?.name,
    qualityType: current?.qualityType,
    products: input.products.map((p) => ({
      id: p.id,
      name: p.name,
      qualityType: p.qualityType,
      ...(p.cover ? { cover: p.cover } : {}),
    })),
  };
}
