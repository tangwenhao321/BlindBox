import type { PrizeTier } from "./config";
import { normalizeCeremonyTier } from "./ceremonyTier";

/** Resolve remote voice-line URI for tier (+ optional theme). Quiet no-op when missing. */
export function resolveTierVoiceLineUri(
  tier: PrizeTier,
  themeId?: string | null,
  uris?: Record<string, string> | null,
): string | null {
  if (!uris) return null;
  const ceremony = normalizeCeremonyTier(tier);
  const theme = (themeId ?? "").trim();
  const candidates = [
    theme ? `${theme}:${ceremony}` : "",
    theme ? `${theme}_${ceremony}` : "",
    theme ? `${ceremony}:${theme}` : "",
    ceremony,
    ceremony.toLowerCase(),
    tier,
    String(tier).toLowerCase(),
    theme || "",
  ].filter(Boolean);
  for (const key of candidates) {
    const uri = uris[key]?.trim();
    if (uri) return uri;
  }
  return null;
}
