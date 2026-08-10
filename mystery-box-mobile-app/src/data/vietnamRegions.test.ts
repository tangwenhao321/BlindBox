import { describe, expect, it } from "vitest";
import { VIETNAM_REGIONS, getVietnamRegionLabel, getVietnamRegionOptions } from "./vietnamRegions";

describe("vietnamRegions", () => {
  it("lists 63 provinces and municipalities", () => {
    expect(VIETNAM_REGIONS).toHaveLength(63);
    const codes = VIETNAM_REGIONS.map((r) => r.code);
    expect(new Set(codes).size).toBe(63);
  });

  it("uses Vietnamese labels when useVi is true", () => {
    const hanoi = VIETNAM_REGIONS[0];
    expect(getVietnamRegionLabel(hanoi, true)).toBe("Thành phố Hà Nội");
    expect(getVietnamRegionLabel(hanoi, false)).toBe("Hanoi");
  });

  it("getVietnamRegionOptions returns one label per region", () => {
    expect(getVietnamRegionOptions(true)).toHaveLength(63);
    expect(getVietnamRegionOptions(false)).toHaveLength(63);
  });
});
