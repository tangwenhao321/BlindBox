import { getRevealRemoteConfig } from "./revealRemote";

export type ProductStory = {
  productId: string;
  title: string;
  body: string;
  tagline?: string;
};

const STUB_STORIES: Record<string, Omit<ProductStory, "productId">> = {
  default: {
    title: "A collector's find",
    body: "Every draw adds a chapter to your collection.",
    tagline: "Keep collecting",
  },
};

export function resolveProductStory(productId: string, productName?: string): ProductStory {
  const remote = getRevealRemoteConfig();
  const stubKey = remote.festivalTemplateId ?? "default";
  const stub = STUB_STORIES[stubKey] ?? STUB_STORIES.default;
  const name = productName?.trim() || productId;
  return {
    productId,
    title: stub.title.replace("{name}", name),
    body: stub.body.replace("{name}", name),
    tagline: stub.tagline,
  };
}
