import { describe, expect, it } from "vitest";
import { computeMemberLevelProgress } from "./memberLevel";

describe("computeMemberLevelProgress", () => {
  it("starts at level 1 with zero coins", () => {
    const p = computeMemberLevelProgress(0);
    expect(p.level).toBe(1);
    expect(p.nextLevelAt).toBe(100);
    expect(p.progress).toBe(0);
  });

  it("advances when crossing threshold", () => {
    const p = computeMemberLevelProgress(150);
    expect(p.level).toBe(2);
    expect(p.progress).toBeGreaterThan(0);
    expect(p.progress).toBeLessThan(1);
  });

  it("caps at max level", () => {
    const p = computeMemberLevelProgress(99999);
    expect(p.level).toBe(LEVEL_TITLES_LENGTH());
    expect(p.nextLevelAt).toBeNull();
    expect(p.progress).toBe(1);
  });
});

function LEVEL_TITLES_LENGTH() {
  return 10;
}
