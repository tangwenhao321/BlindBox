import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDrawFeed, fetchDrawFeedPage } from "./drawFeedService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("drawFeedService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchDrawFeedPage uses box-scoped path", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { items: [{ id: "d1", displayName: "U", productName: "P", qualityType: "LEGENDARY", lastOne: false, createdTime: "2026-01-01" }], nextCursor: "c2" } },
    });
    const page = await fetchDrawFeedPage("tok", "box-1", 10);
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe("c2");
    expect(getMock).toHaveBeenCalledWith(
      "/front/mystery-box/box-1/draw-feed",
      expect.objectContaining({ params: { limit: 10 } }),
    );
  });

  it("fetchDrawFeed returns items only", async () => {
    getMock.mockResolvedValueOnce({ data: { result: { items: [], nextCursor: null } } });
    await expect(fetchDrawFeed(undefined, null)).resolves.toEqual([]);
  });

  it("fetchDrawFeedPage returns empty on error", async () => {
    getMock.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchDrawFeedPage("tok", null)).resolves.toEqual({ items: [], nextCursor: null });
  });
});
