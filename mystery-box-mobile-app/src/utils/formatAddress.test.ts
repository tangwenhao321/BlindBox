import { describe, expect, it } from "vitest";
import { formatAddressSummary } from "./formatAddress";

describe("formatAddressSummary", () => {
  it("joins name phone and address lines", () => {
    const text = formatAddressSummary({
      id: "1",
      realName: "张三",
      phoneNumber: "13800000000",
      details: "科技园路",
      houseNumber: "1栋",
    });
    expect(text).toContain("张三");
    expect(text).toContain("科技园路");
  });

  it("returns null when empty", () => {
    expect(formatAddressSummary(null)).toBeNull();
  });
});
