import { describe, expect, it } from "vitest";
import { pickMallCategoryIcon } from "./mallCategoryIcon";

describe("pickMallCategoryIcon", () => {
  it("returns default for empty names", () => {
    expect(pickMallCategoryIcon("")).toBe("gift-outline");
    expect(pickMallCategoryIcon("   ")).toBe("gift-outline");
  });

  it("matches ASCII brand and category keywords", () => {
    expect(pickMallCategoryIcon("Apple iPhone")).toBe("cellphone");
    expect(pickMallCategoryIcon("Xiaomi Redmi")).toBe("cellphone-wireless");
    expect(pickMallCategoryIcon("Digital 3C")).toBe("laptop");
    expect(pickMallCategoryIcon("Hot Sale")).toBe("fire");
  });

  it("matches common CJK category terms", () => {
    expect(pickMallCategoryIcon("苹果专区")).toBe("cellphone");
    expect(pickMallCategoryIcon("小米上新")).toBe("cellphone-wireless");
    expect(pickMallCategoryIcon("数码家电")).toBe("laptop");
    expect(pickMallCategoryIcon("生活家居")).toBe("home-outline");
    expect(pickMallCategoryIcon("爆款热卖")).toBe("fire");
  });

  it("falls back to gift icon for unknown names", () => {
    expect(pickMallCategoryIcon("Mystery")).toBe("gift-outline");
  });
});
