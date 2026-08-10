import type { MysteryBox } from "../types";
import { API_BASE_URL } from "../api";

const FALLBACK = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80";

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
  return `https://picsum.photos/seed/${encodeURIComponent(box.id || box.name)}/800/420`;
}

export function resolveProductImageUrl(
  productId: string,
  name: string,
  cover?: string | null,
) {
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
  return `https://picsum.photos/seed/${encodeURIComponent(`${productId}-${name}`)}/400/400`;
}

export { FALLBACK as BOX_IMAGE_FALLBACK };
