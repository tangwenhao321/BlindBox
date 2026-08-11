import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchBoxProbability,
  fetchProbabilityHistory,
  rateToPercent,
  resolveDisplayRates,
} from "./probabilityService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ Authorization: `Bearer ${token}` }),
}));

describe("probabilityService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchBoxProbability returns result", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          legendaryRate: 100,
          hiddenRate: 500,
          generalRate: 9400,
          updatedAt: "2026-01-01",
          dynamicProbability: true,
          effectiveLegendaryRate: 90,
          effectiveHiddenRate: 600,
          effectiveGeneralRate: 9310,
        },
      },
    });
    const prob = await fetchBoxProbability("box-1", { token: "tok", drawCount: 3 });
    expect(prob?.legendaryRate).toBe(100);
    expect(prob?.effectiveHiddenRate).toBe(600);
    expect(getMock).toHaveBeenCalledWith(
      "/front/mystery-box/box-1/probability",
      expect.objectContaining({ params: { drawCount: 3 } }),
    );
  });

  it("resolveDisplayRates prefers effective rates", () => {
    const display = resolveDisplayRates({
      legendaryRate: 100,
      hiddenRate: 500,
      generalRate: 9400,
      updatedAt: "2026-01-01",
      effectiveLegendaryRate: 90,
      effectiveHiddenRate: 600,
      effectiveGeneralRate: 9310,
    });
    expect(display?.adjusted).toBe(true);
    expect(display?.hiddenRate).toBe(600);
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
