import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createStepWatchdog } from "./revealStepWatchdog";

describe("revealStepWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onTimeout after ms when armed", () => {
    const onTimeout = vi.fn();
    const watchdog = createStepWatchdog(500, onTimeout);
    watchdog.arm();
    vi.advanceTimersByTime(499);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not fire after disarm", () => {
    const onTimeout = vi.fn();
    const watchdog = createStepWatchdog(200, onTimeout);
    watchdog.arm();
    watchdog.disarm();
    vi.advanceTimersByTime(500);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("reset restarts the timer", () => {
    const onTimeout = vi.fn();
    const watchdog = createStepWatchdog(300, onTimeout);
    watchdog.arm();
    vi.advanceTimersByTime(250);
    watchdog.reset();
    vi.advanceTimersByTime(250);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
