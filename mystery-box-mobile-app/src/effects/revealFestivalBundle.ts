import { getRevealRemoteConfig } from "./revealRemote";

export type FestivalBundleAssets = {
  templateId: string;
  particleUri?: string;
  backdropUri?: string;
  loadedAt: number;
};

const cache = new Map<string, FestivalBundleAssets>();

export async function loadFestivalTemplateAssets(templateId?: string): Promise<FestivalBundleAssets | null> {
  const id = templateId ?? getRevealRemoteConfig().festivalTemplateId;
  if (!id) return null;
  const hit = cache.get(id);
  if (hit) return hit;
  const bundle: FestivalBundleAssets = {
    templateId: id,
    particleUri: `/festival/${id}/particles.json`,
    backdropUri: `/festival/${id}/backdrop.png`,
    loadedAt: Date.now(),
  };
  cache.set(id, bundle);
  return bundle;
}

export function getCachedFestivalBundle(templateId: string): FestivalBundleAssets | undefined {
  return cache.get(templateId);
}

export function clearFestivalBundleCache(): void {
  cache.clear();
}
