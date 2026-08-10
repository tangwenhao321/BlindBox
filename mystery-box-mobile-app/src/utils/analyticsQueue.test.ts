import { beforeEach, describe, expect, it } from "vitest";
import {
  drainEvents,
  getPendingAnalyticsCount,
  markAnalyticsUploadError,
  requeueEvents,
  shouldShowAnalyticsQueueHint,
} from "./analytics";

describe("analytics queue hint", () => {
  beforeEach(() => {
    while (getPendingAnalyticsCount() > 0) {
      drainEvents(500);
    }
  });

  it("shows hint after upload error with enough pending events", () => {
    markAnalyticsUploadError();
    requeueEvents(
      Array.from({ length: 8 }, (_, i) => ({
        name: "test_event",
        at: new Date().toISOString(),
        payload: { i },
      })),
    );
    expect(getPendingAnalyticsCount()).toBeGreaterThanOrEqual(8);
    expect(shouldShowAnalyticsQueueHint()).toBe(true);
  });
});
