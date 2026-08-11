import type { AppPublicConfig } from "../services/appConfigService";
import { getRuntimeFeatureFlags } from "../utils/runtimeFeatureFlags";

const FLAG_BY_FEATURE: Partial<Record<string, string>> = {
  community: "mobile.community.enabled",
  marketplace: "mobile.marketplace.enabled",
  welfare: "mobile.welfare.enabled",
};

/**
 * Remote feature / kill-switch helper.
 * Prefers passed flags, then in-memory runtime flags (from last public config / cache)
 * so a disabled flag stays off across remounts before the next network fetch.
 * Absent keys stay on (opt-out) so unseeded DB rows do not blank the shell.
 */
export function isRemoteFeatureEnabled(
  flagKey: string,
  featureFlags?: AppPublicConfig["featureFlags"],
  defaultValue = true,
): boolean {
  const flags = featureFlags ?? getRuntimeFeatureFlags();
  if (!flags || !(flagKey in flags)) return defaultValue;
  return flags[flagKey] !== false;
}

export function isFeatureFlagEnabled(
  featureKey: keyof typeof FLAG_BY_FEATURE | string,
  featureFlags?: AppPublicConfig["featureFlags"],
): boolean {
  const flagKey = FLAG_BY_FEATURE[featureKey as string];
  if (!flagKey) return true;
  return isRemoteFeatureEnabled(flagKey, featureFlags);
}
