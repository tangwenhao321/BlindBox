import { describe, expect, it } from "vitest";
import { isAppViewAccessible, isFeatureTitleAccessible } from "./featureAccess";
import { setRuntimeFeatureFlags } from "../utils/runtimeFeatureFlags";

describe("featureAccess", () => {
  it("blocks gated views when runtime flags disable them", () => {
    setRuntimeFeatureFlags({
      "mobile.community.enabled": false,
      "mobile.marketplace.enabled": true,
      "mobile.welfare.enabled": true,
    });
    expect(isAppViewAccessible("community")).toBe(false);
    expect(isAppViewAccessible("marketplace")).toBe(true);
    expect(isAppViewAccessible("home")).toBe(true);
  });

  it("blocks feature titles mapped to disabled views", () => {
    setRuntimeFeatureFlags({ "mobile.welfare.enabled": false });
    expect(isFeatureTitleAccessible("福利中心")).toBe(false);
    expect(isFeatureTitleAccessible("优惠券")).toBe(true);
  });
});
