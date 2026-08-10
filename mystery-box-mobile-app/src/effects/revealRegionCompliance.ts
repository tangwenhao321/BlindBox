const REGION_BLOCKLIST: Record<string, readonly string[]> = {
  "zh-CN": [],
  "en-US": [],
  "vi-VN": ["flash_intense", "gambling_metaphor"],
  "ar-SA": ["flash_intense", "confetti_burst"],
};

export function resolveRegionVisualBlocklist(locale: string): ReadonlySet<string> {
  const normalized = locale.trim() || "en-US";
  const list = REGION_BLOCKLIST[normalized] ?? [];
  return new Set(list);
}

export function isRegionVisualBlocked(locale: string, visualId: string): boolean {
  return resolveRegionVisualBlocklist(locale).has(visualId);
}

const REVEAL_IMAGE_URI_BLOCKLIST = ["blocked.", "nsfw.", "malware."];

export function isRevealImageUriBlocked(uri?: string | null): boolean {
  if (!uri?.trim()) return false;
  const lower = uri.toLowerCase();
  return REVEAL_IMAGE_URI_BLOCKLIST.some((term) => lower.includes(term));
}
