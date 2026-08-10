import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBoxInsight } from "./boxInsightService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("boxInsightService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchBoxInsight normalizes prizeLines", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          poolTotal: 50,
          poolRemaining: 20,
          prizeLines: undefined,
        },
      },
    });
    const insight = await fetchBoxInsight(undefined, "box-1");
    expect(insight?.prizeLines).toEqual([]);
  });

  it("fetchBoxInsight returns null on error", async () => {
    getMock.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchBoxInsight("tok", "box-1")).resolves.toBeNull();
  });
});
