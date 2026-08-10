import { describe, expect, it } from "vitest";
import { buildOfflinePendingActions } from "./OfflineBanner";

describe("OfflineBanner", () => {
  it("maps queue labels to action text", () => {
    const labels = buildOfflinePendingActions(
      { count: 2, labels: ["offline.actionOrder", "offline.actionPay"], items: [] },
      ", ",
    );
    expect(labels.length).toBe(2);
    expect(labels.every((label) => label.length > 0)).toBe(true);
  });
});
