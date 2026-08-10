import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimAbandonOffer, fetchOrderPaymentMeta } from "./orderPaymentService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("orderPaymentService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("fetchOrderPaymentMeta returns result", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          orderId: "ord-1",
          payDeadline: "2026-01-01T00:00:00Z",
          retentionClaimed: false,
          retentionDiscountAmount: 0,
        },
      },
    });
    const meta = await fetchOrderPaymentMeta("tok", "ord-1");
    expect(meta?.orderId).toBe("ord-1");
  });

  it("fetchOrderPaymentMeta returns null on error", async () => {
    getMock.mockRejectedValueOnce(new Error("404"));
    await expect(fetchOrderPaymentMeta("tok", "missing")).resolves.toBeNull();
  });

  it("claimAbandonOffer posts and returns result", async () => {
    postMock.mockResolvedValueOnce({
      data: { result: { granted: true, discountAmount: 5, message: "ok" } },
    });
    const result = await claimAbandonOffer("tok", "ord-2");
    expect(result.granted).toBe(true);
    expect(result.discountAmount).toBe(5);
  });
});
