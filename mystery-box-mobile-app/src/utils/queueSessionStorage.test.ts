import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}));

import {
  clearActiveQueueSession,
  getActiveQueueSession,
  setActiveQueueSession,
} from "./queueSessionStorage";

describe("queueSessionStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists active queue session", async () => {
    await setActiveQueueSession({ boxId: "b1", boxName: "Test Box" });
    expect(mockSetItem).toHaveBeenCalledWith(
      "active_draw_queue_session_v1",
      JSON.stringify({ boxId: "b1", boxName: "Test Box" }),
    );
  });

  it("reads active queue session", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ boxId: "b1", boxName: "Test Box" }));
    await expect(getActiveQueueSession()).resolves.toEqual({ boxId: "b1", boxName: "Test Box" });
  });

  it("clears session", async () => {
    await clearActiveQueueSession();
    expect(mockRemoveItem).toHaveBeenCalledWith("active_draw_queue_session_v1");
  });
});
