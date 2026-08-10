import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyRefund, fetchRefundTimeline, queryMyRefunds } from "./refundService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("refundService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("applies refund and returns id", async () => {
    postMock.mockResolvedValueOnce({ data: { result: "refund-1" } });
    const id = await applyRefund("token-1", {
      orderId: "order-1",
      reason: "Damaged",
      amount: 50,
    });
    expect(id).toBe("refund-1");
    expect(postMock).toHaveBeenCalledWith(
      "/front/refund-record/save",
      { orderId: "order-1", reason: "Damaged", amount: 50 },
      { headers: { token: "token-1" } },
    );
  });

  it("fetches refund timeline", async () => {
    getMock.mockResolvedValueOnce({
      data: [{ step: "SUBMITTED", label: "Submitted" }],
    });
    const rows = await fetchRefundTimeline("token-1", "refund-9");
    expect(rows[0]?.step).toBe("SUBMITTED");
    expect(getMock).toHaveBeenCalledWith("/front/refund-record/refund-9/timeline", {
      headers: { token: "token-1" },
    });
  });

  it("queries my refunds", async () => {
    postMock.mockResolvedValueOnce({
      data: { content: [{ id: "refund-2", orderId: "order-2", reason: "Late", amount: 20 }] },
    });
    const rows = await queryMyRefunds("token-1");
    expect(rows).toHaveLength(1);
    expect(postMock).toHaveBeenCalledWith(
      "/front/refund-record/query",
      { pageNum: 1, pageSize: 20, query: {} },
      { headers: { token: "token-1" } },
    );
  });
});
