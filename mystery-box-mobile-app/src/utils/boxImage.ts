import type { MysteryBox } from "../types";
import { API_BASE_URL } from "../api";

/**
 * Local brand asset — no Unsplash/Picsum network dependency.
 * Metro resolves PNG; Node/vitest may not — fall back to null and use PlaceholderCover.
 */
function loadLocalFallback(): number | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../../assets/icon.png") as number;
  } catch {
    return null;
  }
}

const FALLBACK = loadLocalFallback();

function joinApiBase(path: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveBoxImageUrl(box: Pick<MysteryBox, "id" | "cover" | "name">) {
  const cover = (box.cover || "").trim();
  if (cover.startsWith("http://") || cover.startsWith("https://")) {
    const uploadsIdx = cover.indexOf("/uploads/");
    if (uploadsIdx >= 0) {
      return joinApiBase(cover.substring(uploadsIdx));
    }
    return cover;
  }
  if (cover) {
    const path = cover.startsWith("/") ? cover : `/${cover}`;
    return joinApiBase(path);
  }
  return "";
}

export function resolveProductImageUrl(
  productId: string,
  name: string,
  cover?: string | null,
) {
  void productId;
  void name;
  const raw = (cover || "").trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const uploadsIdx = raw.indexOf("/uploads/");
    if (uploadsIdx >= 0) return joinApiBase(raw.substring(uploadsIdx));
    return raw;
  }
  if (raw) {
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return joinApiBase(path);
  }
  return "";
}

export { FALLBACK as BOX_IMAGE_FALLBACK };
