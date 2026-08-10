import { beforeEach, describe, expect, it, vi } from "vitest";
import { quoteWarehouseShip, submitWarehouseShip, fetchMyWarehouseShipRequests } from "./warehouseShipService";

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { post: postMock, get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("warehouseShipService", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it("quoteWarehouseShip returns quote", async () => {
    postMock.mockResolvedValueOnce({
      data: { itemCount: 2, payAmount: 12, deliveryFee: 12, productAmount: 0, feeHint: "ok" },
    });
    const quote = await quoteWarehouseShip("tok", "addr-1", [
      { orderId: "o1", productId: "p1" },
    ]);
    expect(quote.itemCount).toBe(2);
    expect(quote.payAmount).toBe(12);
  });

  it("submitWarehouseShip returns request id", async () => {
    postMock.mockResolvedValueOnce({ data: { result: "req-1" } });
    const id = await submitWarehouseShip("tok", "addr-1", [{ orderId: "o1", productId: "p1" }]);
    expect(id).toBe("req-1");
  });

  it("fetchMyWarehouseShipRequests returns list", async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: "req-1", status: "PENDING", itemCount: 1, payAmount: 10 }] });
    const rows = await fetchMyWarehouseShipRequests("tok");
    expect(rows[0]?.id).toBe("req-1");
  });
});
