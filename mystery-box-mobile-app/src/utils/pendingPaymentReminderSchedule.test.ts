import { describe, expect, it } from "vitest";
import { buildPayDeadlineReminderSeconds, fallbackPayReminderSeconds } from "./pendingPaymentReminderSchedule";

describe("pendingPaymentReminderSchedule", () => {
  it("schedules 3min and 1min before deadline", () => {
    const now = Date.parse("2026-05-25T10:00:00.000Z");
    const deadline = "2026-05-25T10:15:00.000Z";
    expect(buildPayDeadlineReminderSeconds(deadline, now)).toEqual([720, 840]);
  });

  it("returns empty when deadline passed", () => {
    expect(buildPayDeadlineReminderSeconds("2020-01-01T00:00:00.000Z", Date.now())).toEqual([]);
  });

  it("fallback is 15 minutes", () => {
    expect(fallbackPayReminderSeconds()).toBe(900);
  });
});
