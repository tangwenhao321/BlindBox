import { router } from "expo-router";
import type { AppView } from "../components/mainTabs/appViews";
import { appViewToHref, isTabAppView } from "./appViewRoutes";

export type ExpoRouterSyncOptions = {
  replace?: boolean;
  orderId?: string;
  boxId?: string;
};

/** Push/replace Expo Router href when in-app navigation changes AppView. */
export function syncAppViewToExpoRouter(view: AppView, options?: ExpoRouterSyncOptions) {
  try {
    const href = appViewToHref(view, { orderId: options?.orderId, boxId: options?.boxId });
    if (options?.replace || isTabAppView(view)) {
      router.replace(href as never);
      return;
    }
    router.push(href as never);
  } catch {
    // Unregistered views (e.g. legacy-only) stay in-memory only.
  }
}

export function syncExpoRouterBack(): boolean {
  try {
    if (router.canGoBack()) {
      router.back();
      return true;
    }
  } catch {
    // Router stack may be out of sync with in-memory AppView stack.
  }
  return false;
}
