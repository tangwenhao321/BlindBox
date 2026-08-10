import { describe, expect, it } from "vitest";

/** Keep in sync with useTabletLayout.ts TABLET_MIN_WIDTH */
const TABLET_MIN_WIDTH = 600;

describe("useTabletLayout", () => {
  it("uses 600px as default tablet breakpoint", () => {
    expect(TABLET_MIN_WIDTH).toBe(600);
  });
});
