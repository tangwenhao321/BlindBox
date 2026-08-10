import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "../query/keys";

const invalidateQueries = vi.fn();

vi.mock("../query/queryClient", () => ({
  queryClient: {
    invalidateQueries,
  },
}));

describe("invalidateAppQueries", () => {
  beforeEach(() => {
    invalidateQueries.mockClear();
  });

  it("invalidates core catalog and user list queries", async () => {
    const { invalidateAppQueries } = await import("./invalidateAppQueries");
    invalidateAppQueries("tok-1");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.boxes.home("tok-1") });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.orders.list("tok-1") });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.addresses.list("tok-1") });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.favorites.ids("tok-1") });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.coupons.list("tok-1") });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.list("tok-1", 30),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.home.summary("tok-1") });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["boxDetails", "purchaseLimit", "tok-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["boxDetails", "auxiliary", "tok-1"] });
    expect(invalidateQueries).toHaveBeenCalledTimes(9);
  });

  it("invalidates order queries only", async () => {
    const { invalidateOrderQueries } = await import("./invalidateAppQueries");
    invalidateOrderQueries("tok-2");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.orders.list("tok-2") });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("invalidates address queries only", async () => {
    const { invalidateAddressQueries } = await import("./invalidateAppQueries");
    invalidateAddressQueries("tok-3");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.addresses.list("tok-3") });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("invalidates favorite and coupon queries", async () => {
    const { invalidateFavoriteQueries, invalidateCouponQueries } = await import("./invalidateAppQueries");
    invalidateFavoriteQueries("tok-4");
    invalidateCouponQueries("tok-4");
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.favorites.ids("tok-4") });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.coupons.list("tok-4") });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it("invalidates notifications with custom limit", async () => {
    const { invalidateNotificationQueries } = await import("./invalidateAppQueries");
    invalidateNotificationQueries("tok-5", 20);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.list("tok-5", 20),
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });
});
