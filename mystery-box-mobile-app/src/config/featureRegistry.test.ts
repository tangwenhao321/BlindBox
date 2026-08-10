import { describe, expect, it } from "vitest";
import { FEATURE_KEYS, isFeatureVisibleForLocale, resolveFeatureRoute } from "./featureRegistry";

describe("featureRegistry", () => {
  it("routes coupons to dedicated view", () => {
    expect(resolveFeatureRoute(FEATURE_KEYS.COUPONS)).toEqual({ type: "view", view: "coupons" });
  });

  it("routes check-in shortcut to welfare tab", () => {
    expect(resolveFeatureRoute(FEATURE_KEYS.CHECK_IN)).toEqual({ type: "view", view: "welfare" });
  });

  it("routes contact support action", () => {
    expect(resolveFeatureRoute(FEATURE_KEYS.CONTACT_SUPPORT)).toEqual({
      type: "action",
      action: "contactSupport",
    });
  });

  it("routes refunds to dedicated view", () => {
    expect(resolveFeatureRoute(FEATURE_KEYS.REFUNDS)).toEqual({ type: "view", view: "refunds" });
  });

  it("resolves legacy Chinese CMS titles", () => {
    expect(resolveFeatureRoute("优惠券")).toEqual({ type: "view", view: "coupons" });
    expect(resolveFeatureRoute("邀请好友")).toEqual({ type: "action", action: "shareInvite" });
    expect(resolveFeatureRoute("退款记录")).toEqual({ type: "view", view: "refunds" });
  });

  it("hides enterprise WeChat for vi-VN locale", () => {
    expect(isFeatureVisibleForLocale(FEATURE_KEYS.ENTERPRISE_WECHAT, "vi-VN")).toBe(false);
    expect(isFeatureVisibleForLocale(FEATURE_KEYS.ENTERPRISE_WECHAT, "zh-CN")).toBe(true);
    expect(isFeatureVisibleForLocale(FEATURE_KEYS.CONTACT_SUPPORT, "vi-VN")).toBe(true);
  });

  it("respects remote feature flags", () => {
    const flags = {
      "mobile.community.enabled": false,
      "mobile.marketplace.enabled": false,
      "mobile.welfare.enabled": false,
    };
    expect(isFeatureVisibleForLocale(FEATURE_KEYS.COMMUNITY, "vi-VN", flags)).toBe(false);
    expect(isFeatureVisibleForLocale(FEATURE_KEYS.MARKETPLACE, "vi-VN", flags)).toBe(false);
    expect(isFeatureVisibleForLocale(FEATURE_KEYS.WELFARE, "vi-VN", flags)).toBe(false);
    expect(isFeatureVisibleForLocale(FEATURE_KEYS.COUPONS, "vi-VN", flags)).toBe(true);
  });
});
