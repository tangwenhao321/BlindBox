/**
 * Session/module state for recommend → order conversion attribution.
 * RecommendCarousel sets the variant on click; createOrder takes it once per box.
 */

const variantsByBoxId = new Map<string, string>();

export function setVariant(boxId: string, variant: string | undefined | null): void {
  const id = boxId?.trim();
  if (!id) return;
  const v = variant?.trim();
  if (!v) {
    variantsByBoxId.delete(id);
    return;
  }
  variantsByBoxId.set(id, v);
}

/** Returns and clears the last recommend variant for this box (one-shot). */
export function takeVariant(boxId: string): string | undefined {
  const id = boxId?.trim();
  if (!id) return undefined;
  const v = variantsByBoxId.get(id);
  variantsByBoxId.delete(id);
  return v;
}

/** Test helper — clear all pending attribution. */
export function clearRecommendAttribution(): void {
  variantsByBoxId.clear();
}
