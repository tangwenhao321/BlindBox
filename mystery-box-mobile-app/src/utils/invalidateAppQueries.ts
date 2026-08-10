import { queryKeys } from "../query/keys";
import { queryClient } from "../query/queryClient";

export function invalidateHomeSummaryQueries(token: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.home.summary(token) });
}

export function invalidatePurchaseLimitQueries(token: string, boxId?: string) {
  if (boxId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.boxDetails.purchaseLimit(token, boxId) });
    return;
  }
  void queryClient.invalidateQueries({ queryKey: ["boxDetails", "purchaseLimit", token] });
}

export function invalidateBoxAuxiliaryQueries(token: string, boxId?: string) {
  if (boxId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.boxDetails.auxiliary(token, boxId) });
    return;
  }
  void queryClient.invalidateQueries({ queryKey: ["boxDetails", "auxiliary", token] });
}

export function invalidateAppQueries(token: string, boxId?: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.boxes.home(token) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(token) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.addresses.list(token) });
  invalidateHomeSummaryQueries(token);
  invalidatePurchaseLimitQueries(token);
  invalidateBoxAuxiliaryQueries(token, boxId);
  invalidateFavoriteQueries(token);
  invalidateCouponQueries(token);
  invalidateNotificationQueries(token);
}

export function invalidateFavoriteQueries(token: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.favorites.ids(token) });
}

export function invalidateCouponQueries(token: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.coupons.list(token) });
}

export function invalidateOrderQueries(token: string) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(token) });
}

export function invalidateAddressQueries(token: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.addresses.list(token) });
}

export function invalidateNotificationQueries(token: string, limit = 30) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list(token, limit) });
}
