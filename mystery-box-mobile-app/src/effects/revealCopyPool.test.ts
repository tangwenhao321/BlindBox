import { describe, expect, it } from "vitest";
import { COPY_POOL_COOLDOWN_MS, pickCopyPoolKey, resetCopyPoolRecentForTests } from "./revealCopyPool";

describe("revealCopyPool LRU", () => {
  it("avoids repeating keys within recent window", () => {
    resetCopyPoolRecentForTests();
    const keys = new Set<string>();
    for (let i = 0; i < 6; i += 1) {
      keys.add(pickCopyPoolKey("progressGeneral", 4, `order:${i}`));
    }
    expect(keys.size).toBeGreaterThan(1);
    resetCopyPoolRecentForTests();
  });

  it("respects 3-minute cooldown for same pool key", () => {
    resetCopyPoolRecentForTests();
    const first = pickCopyPoolKey("progressGeneral", 4, "order:1:0");
    const second = pickCopyPoolKey("progressGeneral", 4, "order:1:1");
    expect(second).not.toBe(first);
    expect(COPY_POOL_COOLDOWN_MS).toBe(180_000);
    resetCopyPoolRecentForTests();
  });
});
