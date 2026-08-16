import i18n from "../i18n";

export type ProductStory = {
  productId: string;
  title: string;
  body: string;
  tagline?: string;
};

/** Locale-aware IP caption for adventure reveal + long-press story sheet. */
export function resolveProductStory(productId: string, productName?: string): ProductStory {
  const name = productName?.trim() || productId;
  return {
    productId,
    title: i18n.t("revealOverlay.productStoryTitleNamed", { name }),
    body: i18n.t("revealOverlay.productStoryBody", { name }),
    tagline: i18n.t("revealOverlay.productStoryTagline", { name }),
  };
}
