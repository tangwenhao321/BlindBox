export type RevealNetworkTier = "wifi" | "cellular" | "offline";

let networkTier: RevealNetworkTier = "wifi";

export function setRevealNetworkTier(tier: RevealNetworkTier): void {
  networkTier = tier;
}

export function getRevealNetworkTier(): RevealNetworkTier {
  return networkTier;
}

export function resolveNetworkTierParticleScale(tier: RevealNetworkTier = networkTier): number {
  if (tier === "offline") return 0.55;
  if (tier === "cellular") return 0.78;
  return 1;
}

export function resolveNetworkTierImagePriority(tier: RevealNetworkTier = networkTier): "high" | "normal" | "low" {
  if (tier === "wifi") return "high";
  if (tier === "cellular") return "normal";
  return "low";
}

/** Downscale remote URIs on cellular to reduce decode cost during reveal prefetch. */
export function resolveNetworkTierImageUri(uri: string, tier: RevealNetworkTier = networkTier): string {
  if (!uri || tier === "wifi") return uri;
  if (uri.includes("picsum.photos/seed/")) {
    return uri.replace(/\/(\d+)\/(\d+)(?:\?|$)/, tier === "offline" ? "/160/160" : "/240/240");
  }
  if (tier === "offline") {
    const sep = uri.includes("?") ? "&" : "?";
    return `${uri}${sep}w=160&q=55`;
  }
  if (tier === "cellular") {
    const sep = uri.includes("?") ? "&" : "?";
    return `${uri}${sep}w=320&q=70`;
  }
  return uri;
}
