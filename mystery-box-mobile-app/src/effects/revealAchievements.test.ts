import { describe, expect, it } from "vitest";
import { evaluateRevealAchievements } from "./revealAchievements";

describe("revealAchievements", () => {
  it("detects multi rare order", () => {
    const items = evaluateRevealAchievements({
      products: [
        { id: "1", name: "A", qualityType: "HIDDEN" } as never,
        { id: "2", name: "B", qualityType: "LEGENDARY" } as never,
      ],
      allProducts: [],
    });
    expect(items.some((i) => i.kind === "multi_rare_order")).toBe(true);
  });
});
