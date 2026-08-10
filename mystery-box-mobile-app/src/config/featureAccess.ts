import type { AppView } from "../components/mainTabs/appViews";
import { FEATURE_KEYS, isFeatureVisibleForLocale, resolveFeatureRoute, type FeatureKey } from "./featureRegistry";
import { getAppLocale } from "../utils/i18nLocale";
import { getRuntimeFeatureFlags } from "../utils/runtimeFeatureFlags";

const VIEW_TO_FEATURE: Partial<Record<AppView, FeatureKey>> = {
  community: FEATURE_KEYS.COMMUNITY,
  marketplace: FEATURE_KEYS.MARKETPLACE,
  welfare: FEATURE_KEYS.WELFARE,
};

export function isAppViewAccessible(
  view: AppView,
  featureFlags = getRuntimeFeatureFlags(),
  locale = getAppLocale(),
): boolean {
  const key = VIEW_TO_FEATURE[view];
  if (!key) return true;
  return isFeatureVisibleForLocale(key, locale, featureFlags);
}

export function isFeatureTitleAccessible(
  title: string,
  featureFlags = getRuntimeFeatureFlags(),
  locale = getAppLocale(),
): boolean {
  const route = resolveFeatureRoute(title);
  if (route?.type !== "view") return true;
  return isAppViewAccessible(route.view, featureFlags, locale);
}
