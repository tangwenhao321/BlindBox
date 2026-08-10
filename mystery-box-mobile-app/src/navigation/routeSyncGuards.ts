import type { AppView } from "../components/mainTabs/appViews";

/** Skip re-fetching box/order when route sync fires again for the same entity id. */
export function shouldSkipDuplicateEntityRouteSync(
  entityId: string | undefined,
  lastSyncedEntityId: string | undefined,
): boolean {
  return Boolean(entityId && lastSyncedEntityId === entityId);
}

/** Skip syncing when in-app navigation already moved away but expo-router screen is still mounted. */
export function shouldSkipStaleRouteSync(
  routeView: AppView,
  memoryView: AppView | undefined,
  navigationEpoch: number,
  lastSyncedEpoch: number,
): boolean {
  if (memoryView == null || memoryView === routeView) return false;
  // Cold start / deep link before any in-app navigation.
  if (navigationEpoch === 0 && lastSyncedEpoch === 0) return false;
  // Once memory diverges, keep ignoring this mounted route until it becomes focused again.
  return true;
}
