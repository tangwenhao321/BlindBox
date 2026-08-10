import { describe, expect, it, vi } from "vitest";

vi.mock("react-native-reanimated", () => ({
  runOnJS: (fn: () => void) => fn,
}));

describe("onAnimFinished", () => {
  it("invokes callback only when finished is true", async () => {
    const { onAnimFinished } = await import("./onAnimFinished");
    const cb = vi.fn();
    const handler = onAnimFinished(cb);
    handler(false);
    expect(cb).not.toHaveBeenCalled();
    handler(true);
    expect(cb).toHaveBeenCalledOnce();
  });
});
