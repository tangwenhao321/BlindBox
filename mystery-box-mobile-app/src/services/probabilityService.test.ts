import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBoxProbability, fetchProbabilityHistory, rateToPercent } from "./probabilityService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
}));

describe("probabilityService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchBoxProbability returns result", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { legendaryRate: 100, hiddenRate: 500, generalRate: 9400, updatedAt: "2026-01-01" } },
    });
    const prob = await fetchBoxProbability("box-1");
    expect(prob?.legendaryRate).toBe(100);
  });

  it("fetchProbabilityHistory returns list", async () => {
    getMock.mockResolvedValueOnce({ data: { result: [{ legendaryRate: 100, hiddenRate: 500, generalRate: 9400, effectiveTime: "2026-01-01" }] } });
    const history = await fetchProbabilityHistory("box-1", 5);
    expect(history).toHaveLength(1);
  });

  it("rateToPercent formats basis points", () => {
    expect(rateToPercent(125)).toBe("1.25%");
  });
});
