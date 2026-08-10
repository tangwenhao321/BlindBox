import { describe, expect, it, vi } from "vitest";
import { scheduleChainedRevealTrigger } from "./revealChainAdvance";

describe("revealChainAdvance", () => {
  it("schedules next draw after chain delay", () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    const cleanup = scheduleChainedRevealTrigger(0, 5, trigger);
    expect(trigger).not.toHaveBeenCalled();
    vi.advanceTimersByTime(360);
    expect(trigger).toHaveBeenCalledTimes(1);
    cleanup();
    vi.useRealTimers();
  });

  it("does not schedule after last draw", () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    scheduleChainedRevealTrigger(4, 5, trigger);
    vi.advanceTimersByTime(10_000);
    expect(trigger).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
