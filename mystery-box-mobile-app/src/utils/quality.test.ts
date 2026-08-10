import { describe, expect, it } from "vitest";
import { normalizeQualityTier, qualityLabel, qualityLabelFromRaw } from "./quality";

describe("quality utils", () => {
  it("normalizes LEGEND to LEGENDARY", () => {
    expect(normalizeQualityTier("LEGEND")).toBe("LEGENDARY");
  });

  it("labels tiers in Chinese", () => {
    expect(qualityLabel("EPIC")).toBe("史诗");
    expect(qualityLabelFromRaw("RARE")).toBe("稀有");
    expect(qualityLabelFromRaw(null)).toBe("普通");
  });
});
