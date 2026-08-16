import { getRevealRemoteConfig } from "./revealRemote";

export type FestivalTint = {
  id: string;
  rim: readonly string[];
  wash: string;
  kind: "tet" | "limited";
};

const TET_TINT: FestivalTint = {
  id: "tet",
  rim: ["#C41E3A", "#FFD54F", "#C41E3A"],
  wash: "rgba(196,30,58,0.28)",
  kind: "tet",
};

/** Lunar New Year window: January–February (covers VN Tết / CNY). */
export function isTetCalendarWindow(nowMs = Date.now()): boolean {
  const month = new Date(nowMs).getMonth();
  return month === 0 || month === 1;
}

function isTestVariant(): boolean {
  return process.env.EXPO_PUBLIC_APP_VARIANT === "test";
}

function tintFromRemote(): FestivalTint | null {
  const cfg = getRevealRemoteConfig();
  const id = (cfg.festivalTemplateId ?? "").trim().toLowerCase();
  const limited = (cfg.limitedThemePriority ?? 0) > 0;
  if (!id && !limited) return null;
  if (/tet|tết|lunar|spring|cny|chunjie|newyear|春节|新年/.test(id)) {
    return { ...TET_TINT, id: id || "tet" };
  }
  return {
    id: id || "limited",
    rim: ["#FFD54F", "#FFF8E1", "#D4A017"],
    wash: "rgba(255,213,79,0.22)",
    kind: "limited",
  };
}

export function resolveFestivalTint(nowMs = Date.now()): FestivalTint | null {
  const remote = tintFromRemote();
  if (remote) return remote;
  if (isTetCalendarWindow(nowMs)) return TET_TINT;
  return null;
}

/** Firecrackers / red packets: real Tet, remote template, or test APK preview. */
export function shouldShowFestivalOverlay(nowMs = Date.now()): boolean {
  if (resolveFestivalTint(nowMs)) return true;
  return isTestVariant();
}

/** Swap BGM to festive pack only for real Tet / remote template — not test-only overlay. */
export function shouldReplaceFestivalBgm(nowMs = Date.now()): boolean {
  const remote = tintFromRemote();
  if (remote?.kind === "tet") return true;
  return isTetCalendarWindow(nowMs);
}

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
