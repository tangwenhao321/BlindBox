import type { AppPublicConfig } from "../services/appConfigService";

const FLAG_BY_FEATURE: Partial<Record<string, string>> = {
  community: "mobile.community.enabled",
  marketplace: "mobile.marketplace.enabled",
  welfare: "mobile.welfare.enabled",
};

/** Returns true when remote flag is absent (default on) or explicitly enabled. */
export function isRemoteFeatureEnabled(
  flagKey: string,
  featureFlags?: AppPublicConfig["featureFlags"],
  defaultValue = true,
): boolean {
  if (!featureFlags || !(flagKey in featureFlags)) return defaultValue;
  return featureFlags[flagKey] !== false;
}

export function isFeatureFlagEnabled(
  featureKey: keyof typeof FLAG_BY_FEATURE | string,
  featureFlags?: AppPublicConfig["featureFlags"],
): boolean {
  const flagKey = FLAG_BY_FEATURE[featureKey as string];
  if (!flagKey) return true;
  return isRemoteFeatureEnabled(flagKey, featureFlags);
}
