import { beforeEach, describe, expect, it, vi } from "vitest";
import { followNotificationDeepLink } from "./followNotificationDeepLink";
import { trackEvent } from "../utils/analytics";

vi.mock("../utils/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("../utils/deepLinkParams", () => ({
  setPendingNotificationDeepLink: vi.fn(),
  setPendingShipRequestId: vi.fn(),
}));

vi.mock("../navigation/pushAppDeepLink", () => ({
  pushAppDeepLink: () => false,
}));

describe("followNotificationDeepLink", () => {
  const navigate = vi.fn();
  const openOrderDetails = vi.fn();
  const openBoxDetails = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens box details when logged in with boxId", () => {
    followNotificationDeepLink(
      { view: "boxDetails", boxId: "box-42" },
      true,
      navigate,
      openOrderDetails,
      openBoxDetails,
    );
    expect(openBoxDetails).toHaveBeenCalledWith("box-42");
    expect(navigate).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(
      "deep_link_open",
      expect.objectContaining({ view: "boxDetails", boxId: "box-42" }),
    );
  });

  it("navigates to boxDetails without opener when boxId missing", () => {
    followNotificationDeepLink({ view: "boxDetails" }, true, navigate, openOrderDetails, openBoxDetails);
    expect(openBoxDetails).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("boxDetails");
  });

  it("opens order details when orderId present", () => {
    followNotificationDeepLink(
      { view: "orderDetails", orderId: "ord-1" },
      true,
      navigate,
      openOrderDetails,
      openBoxDetails,
    );
    expect(openOrderDetails).toHaveBeenCalledWith("ord-1");
    expect(navigate).not.toHaveBeenCalled();
  });
});
