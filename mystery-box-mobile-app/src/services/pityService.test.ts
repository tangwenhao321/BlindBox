import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPityProgress } from "./pityService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("pityService", () => {
  beforeEach(() => getMock.mockReset());

  it("returns pity progress", async () => {
    getMock.mockResolvedValueOnce({ data: { result: { current: 3, threshold: 10, remaining: 7 } } });
    const progress = await fetchPityProgress("tok", "box-1");
    expect(progress?.remaining).toBe(7);
  });

  it("throws on error", async () => {
    getMock.mockRejectedValueOnce(new Error("404"));
    await expect(fetchPityProgress("tok", "box-1")).rejects.toThrow("404");
  });
});
