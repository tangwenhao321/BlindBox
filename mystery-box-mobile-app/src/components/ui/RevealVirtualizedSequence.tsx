import type { ReactNode } from "react";
import type { Product } from "../../types";
import { resolveCeremonyTier } from "../../effects/ceremonyTier";
import { resolveRevealPacing } from "../../effects/revealSequence";

type Props = {
  products: Product[];
  revealIndex: number;
  renderItem: (product: Product, index: number) => ReactNode;
};

/** Windowed reveal list for 100+ draws — only mounts current ±1 indices. */
export function RevealVirtualizedSequence({ products, revealIndex, renderItem }: Props) {
  const window = 1;
  const start = Math.max(0, revealIndex - window);
  const end = Math.min(products.length - 1, revealIndex + window);
  const slice: { product: Product; index: number }[] = [];
  for (let i = start; i <= end; i += 1) {
    slice.push({ product: products[i]!, index: i });
  }
  const ceremony = products[revealIndex] ? resolveCeremonyTier(products[revealIndex]!, products) : undefined;
  const pacing = resolveRevealPacing(revealIndex, products.length, ceremony);
  return (
    <>
      {slice.map(({ product, index }) => (
        <>{renderItem(product, index)}</>
      ))}
      {/* pacing hint keeps tree stable for perf telemetry */}
      {pacing === "fast" ? null : null}
    </>
  );
}
