import { describe, expect, it } from "vitest";
import {
  ceremonyTemplateTimingMultiplier,
  mergeCeremonyTemplateScale,
  normalizeCeremonyTemplateId,
} from "./revealCeremonyTemplate";

describe("revealCeremonyTemplate", () => {
  it("normalizes template ids", () => {
    expect(normalizeCeremonyTemplateId("efficiency")).toBe("efficiency");
    expect(normalizeCeremonyTemplateId("eyeCare")).toBe("eyeCare");
    expect(normalizeCeremonyTemplateId("unknown")).toBe("standard");
  });

  it("applies efficiency vs immersive multipliers", () => {
    expect(mergeCeremonyTemplateScale(1000, "efficiency")).toBe(820);
    expect(mergeCeremonyTemplateScale(1000, "immersive")).toBe(1180);
    expect(mergeCeremonyTemplateScale(500, "standard")).toBe(500);
  });

  it("exposes raw timing multipliers", () => {
    expect(ceremonyTemplateTimingMultiplier("efficiency")).toBeLessThan(1);
    expect(ceremonyTemplateTimingMultiplier("immersive")).toBeGreaterThan(1);
  });
});
