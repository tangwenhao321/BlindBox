import { beforeEach, describe, expect, it, vi } from "vitest";
import { calcPackPrice, getBestPackTeaser, queryDrawPackConfigs } from "./drawPackService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: () => ({}),
}));

describe("drawPackService", () => {
  beforeEach(() => getMock.mockReset());

  it("queryDrawPackConfigs sorts by sortOrder", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: [
          { id: "p2", drawCount: 5, label: "五连", discountRate: 9800, enabled: true, sortOrder: 2 },
          { id: "p1", drawCount: 1, label: "单抽", discountRate: 10000, enabled: true, sortOrder: 1 },
        ],
      },
    });
    const configs = await queryDrawPackConfigs("tok");
    expect(configs[0]?.drawCount).toBe(1);
  });

  it("queryDrawPackConfigs uses fallback when empty", async () => {
    getMock.mockResolvedValueOnce({ data: { result: [] } });
    const configs = await queryDrawPackConfigs();
    expect(configs.length).toBeGreaterThan(0);
  });

  it("calcPackPrice and getBestPackTeaser derive from configs", async () => {
    getMock.mockRejectedValueOnce(new Error("offline"));
    const configs = await queryDrawPackConfigs();
    const pack = calcPackPrice(10, 5, configs);
    expect(pack.price).toBeGreaterThan(0);
    expect(getBestPackTeaser(10, configs)).toBeTruthy();
  });
});
