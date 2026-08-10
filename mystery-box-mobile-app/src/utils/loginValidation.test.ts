import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./i18nLocale", () => ({
  getAppLocale: vi.fn(() => "zh-CN"),
}));

vi.mock("../i18n", () => ({
  default: { t: (key: string) => key },
}));

import { getAppLocale } from "./i18nLocale";
import { validatePhone } from "./loginValidation";

describe("validatePhone", () => {
  beforeEach(() => {
    vi.mocked(getAppLocale).mockReturnValue("zh-CN");
  });

  it("accepts mainland 11-digit numbers for zh-CN", () => {
    expect(validatePhone("13800138000")).toBeNull();
  });

  it("rejects invalid mainland numbers for zh-CN", () => {
    expect(validatePhone("23800138000")).toBe("validation.phone");
    expect(validatePhone("1380013800")).toBe("validation.phone");
  });

  it("accepts 10-digit VN numbers starting with 0", () => {
    vi.mocked(getAppLocale).mockReturnValue("vi-VN");
    expect(validatePhone("0901234567")).toBeNull();
  });

  it("rejects invalid VN numbers", () => {
    vi.mocked(getAppLocale).mockReturnValue("vi-VN");
    expect(validatePhone("901234567")).toBe("validation.phone");
    expect(validatePhone("19012345678")).toBe("validation.phone");
  });
});
