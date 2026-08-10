import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentVip } from "./vipService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("vipService", () => {
  beforeEach(() => getMock.mockReset());

  it("returns vip profile", async () => {
    getMock.mockResolvedValueOnce({ data: { result: { id: "vip-1", endTime: "2026-12-31" } } });
    const profile = await fetchCurrentVip("tok");
    expect(profile?.id).toBe("vip-1");
  });

  it("returns null on error", async () => {
    getMock.mockRejectedValueOnce(new Error("404"));
    await expect(fetchCurrentVip("tok")).resolves.toBeNull();
  });
});
