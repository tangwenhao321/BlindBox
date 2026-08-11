export type RevealNetworkTier = "wifi" | "cellular" | "offline";

const HIGH_RTT_MS = 300;
/** Wifi heroes may request up to this width when layout/targetWidth is provided. */
const WIFI_HERO_MAX_WIDTH = 1200;
const WIFI_HERO_MIN_WIDTH = 800;

let networkTier: RevealNetworkTier = "wifi";
let networkRttMs = 0;

export function setRevealNetworkTier(tier: RevealNetworkTier): void {
  networkTier = tier;
}

export function getRevealNetworkTier(): RevealNetworkTier {
  return networkTier;
}

/** Probe / API latency in ms; used for Doc2 weak-net degrade (RTT > 300). */
export function setRevealNetworkRtt(ms: number): void {
  networkRttMs = Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export function getRevealNetworkRtt(): number {
  return networkRttMs;
}

export function isRevealNetworkHighRtt(rttMs: number = networkRttMs): boolean {
  return rttMs > HIGH_RTT_MS;
}

/** Classic simplified path when RTT is high (Doc2). */
export function shouldForceClassicRevealNetwork(): boolean {
  return isRevealNetworkHighRtt() || networkTier === "offline";
}

export function resolveNetworkTierParticleScale(tier: RevealNetworkTier = networkTier): number {
  if (isRevealNetworkHighRtt()) return 0.45;
  if (tier === "offline") return 0.55;
  if (tier === "cellular") return 0.78;
  return 1;
}

export function resolveNetworkTierImagePriority(tier: RevealNetworkTier = networkTier): "high" | "normal" | "low" {
  if (tier === "wifi") return "high";
  if (tier === "cellular") return "normal";
  return "low";
}

function resolveTierImageWidth(tier: RevealNetworkTier, targetWidth?: number): number {
  const defaults: Record<RevealNetworkTier, number> = {
    offline: 160,
    cellular: 320,
    wifi: 400,
  };
  const caps: Record<RevealNetworkTier, number> = {
    offline: 160,
    cellular: 320,
    wifi: WIFI_HERO_MAX_WIDTH,
  };

  if (targetWidth == null || !Number.isFinite(targetWidth) || targetWidth <= 0) {
    return defaults[tier];
  }

  const rounded = Math.round(targetWidth);
  if (tier === "wifi") {
    // Heroes: allow 800–1200 when layout is large; otherwise keep at least default.
    if (rounded >= WIFI_HERO_MIN_WIDTH) {
      return Math.min(WIFI_HERO_MAX_WIDTH, Math.max(WIFI_HERO_MIN_WIDTH, rounded));
    }
    return Math.min(WIFI_HERO_MAX_WIDTH, Math.max(defaults.wifi, rounded));
  }
  return Math.min(caps[tier], Math.max(1, rounded));
}

function isCloudObjectHost(hostname: string): "aliyun" | "tencent" | null {
  const host = hostname.toLowerCase();
  if (host.includes("aliyuncs.com")) return "aliyun";
  if (host.includes("myqcloud.com") || host.includes("qcloud.com")) return "tencent";
  return null;
}

function hasCloudImageProcess(uri: string): boolean {
  return (
    uri.includes("x-oss-process=") ||
    uri.includes("imageMogr2/") ||
    uri.includes("imageView2/") ||
    uri.includes("imageMogr2%") ||
    uri.includes("imageView2%")
  );
}

/** Append Aliyun OSS / Tencent COS resize params; returns null when host is not a known CDN. */
export function appendCloudImageProcessParams(uri: string, width: number): string | null {
  if (!uri || !Number.isFinite(width) || width <= 0) return null;
  let hostname: string;
  try {
    hostname = new URL(uri).hostname;
  } catch {
    return null;
  }
  const kind = isCloudObjectHost(hostname);
  if (!kind) return null;
  if (hasCloudImageProcess(uri)) return uri;

  const w = Math.round(width);
  const sep = uri.includes("?") ? "&" : "?";
  if (kind === "aliyun") {
    return `${uri}${sep}x-oss-process=image/resize,w_${w}`;
  }
  return `${uri}${sep}imageView2/2/w/${w}`;
}

/** Downscale remote URIs on cellular to reduce decode cost during reveal prefetch. */
export function resolveNetworkTierImageUri(
  uri: string,
  tier: RevealNetworkTier = networkTier,
  targetWidth?: number,
): string {
  if (!uri) return uri;

  const width = resolveTierImageWidth(tier, targetWidth);
  const cloudUri = appendCloudImageProcessParams(uri, width);
  if (cloudUri) return cloudUri;

  if (tier === "wifi") return uri;
  if (uri.includes("picsum.photos/seed/")) {
    return uri.replace(/\/(\d+)\/(\d+)(?:\?|$)/, tier === "offline" ? "/160/160" : "/240/240");
  }
  if (tier === "offline") {
    const sep = uri.includes("?") ? "&" : "?";
    return `${uri}${sep}w=160&q=55`;
  }
  if (tier === "cellular") {
    const sep = uri.includes("?") ? "&" : "?";
    return `${uri}${sep}w=${width}&q=70`;
  }
  return uri;
}
