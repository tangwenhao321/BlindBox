import type { AppView } from "../components/mainTabs/appViews";
import { resolveDeepLinkFromPush } from "../navigation/routeRegistry";

export type NotificationDeepLink = {
  view: AppView;
  orderId?: string;
  boxId?: string;
  shipRequestId?: string;
  paymentResponseCode?: string;
  spectatorToken?: string;
};

export function resolveNotificationDeepLink(
  category?: string | null,
  refId?: string | null,
): NotificationDeepLink | null {
  return resolveDeepLinkFromPush(category, refId);
}

export function extractPushData(data: unknown): { category?: string; refId?: string } {
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  return {
    category: typeof record.category === "string" ? record.category : undefined,
    refId: typeof record.refId === "string" ? record.refId : undefined,
  };
}
