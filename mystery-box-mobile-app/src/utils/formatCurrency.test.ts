import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./i18nLocale", () => ({
  getAppLocale: vi.fn(() => "zh-CN"),
}));

vi.stubEnv("EXPO_PUBLIC_CURRENCY", "");

import { getAppLocale } from "./i18nLocale";
import {
  formatCurrency,
  formatCurrencyDiscount,
  formatCurrencyOptional,
  getAppCurrency,
} from "./formatCurrency";

describe("formatCurrency", () => {
  beforeEach(() => {
    vi.mocked(getAppLocale).mockReturnValue("zh-CN");
  });

  it("formats CNY for zh-CN locale", () => {
    expect(formatCurrency(12.5)).toContain("12.50");
  });

  it("formats CNY for en-US locale", () => {
    vi.mocked(getAppLocale).mockReturnValue("en-US");
    const formatted = formatCurrency(99);
    expect(formatted).toMatch(/99\.00/);
  });

  it("formats optional amounts", () => {
    expect(formatCurrencyOptional(null)).toBe("—");
    expect(formatCurrencyOptional(8)).toContain("8.00");
  });

  it("formats discount prefix", () => {
    expect(formatCurrencyDiscount(5)).toMatch(/^-/);
  });

  it("uses VND for vi-VN locale", () => {
    vi.mocked(getAppLocale).mockReturnValue("vi-VN");
    expect(getAppCurrency()).toBe("VND");
    const formatted = formatCurrency(100000);
    expect(formatted).toMatch(/100/);
    expect(formatted).not.toMatch(/\.00[^0]|\.00$/);
  });

  it("respects EXPO_PUBLIC_CURRENCY", () => {
    vi.stubEnv("EXPO_PUBLIC_CURRENCY", "VND");
    expect(getAppCurrency()).toBe("VND");
  });
});
