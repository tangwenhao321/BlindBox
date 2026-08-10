import { describe, expect, it } from "vitest";
import { pickMallCategoryIcon } from "./mallCategoryIcon";

describe("pickMallCategoryIcon", () => {
  it("returns default for empty names", () => {
    expect(pickMallCategoryIcon("")).toBe("🎁");
    expect(pickMallCategoryIcon("   ")).toBe("🎁");
  });

  it("matches ASCII brand and category keywords", () => {
    expect(pickMallCategoryIcon("Apple iPhone")).toBe("📱");
    expect(pickMallCategoryIcon("Xiaomi Redmi")).toBe("📲");
    expect(pickMallCategoryIcon("Digital 3C")).toBe("💻");
    expect(pickMallCategoryIcon("Hot Sale")).toBe("🔥");
  });

  it("matches common CJK category terms", () => {
    expect(pickMallCategoryIcon("苹果专区")).toBe("📱");
    expect(pickMallCategoryIcon("小米上新")).toBe("📲");
    expect(pickMallCategoryIcon("数码家电")).toBe("💻");
    expect(pickMallCategoryIcon("生活家居")).toBe("🏠");
    expect(pickMallCategoryIcon("爆款热卖")).toBe("🔥");
  });

  it("falls back to gift icon for unknown names", () => {
    expect(pickMallCategoryIcon("Mystery")).toBe("🎁");
  });
});
