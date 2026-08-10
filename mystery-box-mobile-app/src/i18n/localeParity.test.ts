import { describe, expect, it } from "vitest";
import enUS from "./locales/en-US";
import viVN from "./locales/vi-VN";
import zhCN from "./locales/zh-CN";
import { collectLocaleKeyPaths } from "./mergeLocale";

describe("locale parity", () => {
  it("zh-CN and en-US share the same translation keys", () => {
    const zhKeys = collectLocaleKeyPaths(zhCN as Record<string, unknown>);
    const enKeys = collectLocaleKeyPaths(enUS as Record<string, unknown>);
    expect(enKeys).toEqual(zhKeys);
  });

  it("vi-VN includes all zh-CN translation keys", () => {
    const zhKeys = collectLocaleKeyPaths(zhCN as Record<string, unknown>);
    const viKeys = collectLocaleKeyPaths(viVN as Record<string, unknown>);
    expect(viKeys).toEqual(zhKeys);
  });
});
