import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requestAppUpdateCheck,
  resetAppUpdateSignal,
  subscribeAppUpdateRequests,
} from "./appUpdateSignal";

describe("appUpdateSignal", () => {
  beforeEach(() => {
    resetAppUpdateSignal();
  });

  it("notifies subscribers with the pushed version code", () => {
    const listener = vi.fn();
    subscribeAppUpdateRequests(listener);

    requestAppUpdateCheck(12);

    expect(listener).toHaveBeenCalledWith(12);
  });

  it("replays a request that arrived before any subscriber mounted", () => {
    requestAppUpdateCheck(7);

    const listener = vi.fn();
    subscribeAppUpdateRequests(listener);

    expect(listener).toHaveBeenCalledWith(7);
  });

  it("replays a queued request only once", () => {
    requestAppUpdateCheck(7);
    subscribeAppUpdateRequests(vi.fn());

    const late = vi.fn();
    subscribeAppUpdateRequests(late);

    expect(late).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAppUpdateRequests(listener);

    unsubscribe();
    requestAppUpdateCheck(3);

    expect(listener).not.toHaveBeenCalled();
  });
});
