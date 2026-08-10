import { describe, expect, it } from "vitest";
import enUS from "./locales/en-US";
import { getLocaleValueByPath } from "./mergeLocale";

const CJK = /[\u3400-\u9fff]/;

/** High-traffic UI strings that must be fully translated in en-US. */
const CRITICAL_EN_US_KEYS = [
  "tabs.home",
  "tabs.mall",
  "tabs.warehouse",
  "tabs.profile",
  "login.heroTitle",
  "settings.title",
  "settings.appearance",
  "orders.title",
  "common.confirm",
  "common.cancel",
  "home.searchPlaceholder",
  "mall.searchPlaceholder",
  "profile.title",
  "profile.login",
  "wallet.balanceText",
  "offline.queuedSubmit",
  "api.requestRetry",
  "checkout.payNowAmount",
  "marketplace.title",
  "warehouse.title",
] as const;

describe("en-US locale quality", () => {
  it("critical UI strings are non-empty and free of CJK characters", () => {
    const locale = enUS as Record<string, unknown>;
    for (const key of CRITICAL_EN_US_KEYS) {
      const value = getLocaleValueByPath(locale, key);
      expect(typeof value, key).toBe("string");
      const text = value as string;
      expect(text.trim().length, key).toBeGreaterThan(0);
      expect(text, key).not.toMatch(CJK);
    }
  });
});
