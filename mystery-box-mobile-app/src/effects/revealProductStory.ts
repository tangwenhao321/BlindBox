import i18n from "../i18n";

export type ProductStorySource = {
  id?: string;
  name?: string;
  description?: string;
  brand?: string;
  tags?: string[];
  attributes?: { name?: string; values?: string[] }[];
};

export type ProductStory = {
  productId: string;
  title: string;
  body: string;
  tagline?: string;
  fromCatalog: boolean;
};

function attrValue(source: ProductStorySource | null | undefined, ...keys: string[]): string {
  const wanted = new Set(keys.map((key) => key.trim().toLowerCase()));
  for (const row of source?.attributes ?? []) {
    const name = row?.name?.trim().toLowerCase();
    if (!name || !wanted.has(name)) continue;
    const value = row.values?.map((item) => item?.trim()).find(Boolean);
    if (value) return value;
  }
  return "";
}

function firstTag(source: ProductStorySource | null | undefined): string {
  return source?.tags?.map((item) => item?.trim()).find(Boolean) || "";
}

/**
 * Prefer SKU attributes / description from ops; otherwise locale templates with {name}.
 */
export function resolveProductStory(
  productId: string,
  productName?: string,
  source?: ProductStorySource | null,
): ProductStory {
  const name = source?.name?.trim() || productName?.trim() || productId;
  const catalogTitle = attrValue(source, "storyTitle", "story_title", "loreTitle", "lore_title");
  const catalogBody =
    attrValue(source, "storyBody", "story_body", "lore", "loreBody") || source?.description?.trim() || "";
  const brand = source?.brand?.trim();
  const usableBrand = brand && brand.toLowerCase() !== "default" ? brand : "";
  const catalogTagline =
    attrValue(source, "storyTagline", "story_tagline", "tagline") || firstTag(source) || usableBrand;
  const fromCatalog = !!(catalogTitle || catalogBody || catalogTagline);
  return {
    productId: source?.id?.trim() || productId,
    title: catalogTitle || i18n.t("revealOverlay.productStoryTitleNamed", { name }),
    body: catalogBody || i18n.t("revealOverlay.productStoryBody", { name }),
    tagline: catalogTagline || i18n.t("revealOverlay.productStoryTagline", { name }),
    fromCatalog,
  };
}
