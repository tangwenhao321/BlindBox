import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTrustMeta } from "./trustMetaService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("trustMetaService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchTrustMeta returns disclosure fields", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          shippingPromise: "48h 内发货",
          minorProtectionHint: "未成年人请在监护人陪同下消费",
          disclosureNote: "概率公示",
        },
      },
    });
    const meta = await fetchTrustMeta("tok", "box-1");
    expect(meta?.shippingPromise).toContain("48h");
  });

  it("fetchTrustMeta returns null on error", async () => {
    getMock.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchTrustMeta(undefined, "box-1")).resolves.toBeNull();
  });
});
