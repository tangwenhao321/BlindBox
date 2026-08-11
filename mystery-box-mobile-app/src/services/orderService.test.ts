import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateOrderPrice,
  cancelUnpaidOrderById,
  createOrder,
  getWechatPrepayParams,
  mockPayOrder,
  redeemOrderToBalance,
  confirmReceiveOrder,
  fetchOrderDrawIntegrity,
} from "./orderService";

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("../api", () => {
  return {
    api: {
      post: postMock,
      get: getMock,
    },
    buildAuthHeaders: (token: string) => ({ token }),
  };
});

describe("orderService", () => {
  beforeEach(() => {
    postMock.mockReset();
    getMock.mockReset();
  });

  it("creates order and returns order id", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: "order-123" },
    });

    const result = await createOrder("token-1", "box-1", "addr-1", 10);
    expect(result).toBe("order-123");
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box-order/create",
      expect.objectContaining({
        baseOrder: expect.objectContaining({ addressId: "addr-1" }),
        items: [{ mysteryBoxId: "box-1", mysteryBoxCount: 10 }],
      }),
      {
        headers: expect.objectContaining({
          token: "token-1",
          "x-device-id": expect.stringMatching(/^mb-/),
        }),
      },
    );
  });

  it("passes recommend variant header from attribution module", async () => {
    const { setVariant } = await import("../utils/lastRecommendAttribution");
    setVariant("box-rec", "PERSONALIZED");
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: "order-rec" },
    });

    await createOrder("token-1", "box-rec", "addr-1", 1);
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box-order/create",
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-recommend-variant": "PERSONALIZED",
        }),
        params: { recommendVariant: "PERSONALIZED" },
      }),
    );
  });

  it("cancels unpaid order", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: "order-123" },
    });

    const result = await cancelUnpaidOrderById("token-1", "order-123");
    expect(result).toBe("order-123");
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box-order/order-123/unpaid/cancel/user",
      {},
      { headers: { token: "token-1" } },
    );
  });

  it("mock pays order", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: "order-123" },
    });
    const result = await mockPayOrder("token-1", "order-123");
    expect(result).toBe("order-123");
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box-order/order-123/pay/mock",
      {},
      expect.objectContaining({ headers: expect.objectContaining({ token: "token-1" }) }),
    );
  });

  it("fetches draw integrity", async () => {
    getMock.mockResolvedValue({
      data: {
        result: {
          ok: true,
          expectedDrawCount: 5,
          actualPrizeCount: 5,
          issueCount: 0,
          message: "ok",
          issues: [],
        },
      },
    });
    const row = await fetchOrderDrawIntegrity("token", "order-1");
    expect(row.ok).toBe(true);
    expect(getMock).toHaveBeenCalledWith("/front/mystery-box-order/order-1/draw-integrity", expect.any(Object));
  });

  it("gets wechat prepay params", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 1,
        msg: "ok",
        result: { appId: "wx-app", paySign: "abc" },
      },
    });

    const result = await getWechatPrepayParams("token-1", "order-123");
    expect(result.appId).toBe("wx-app");
    expect(result.paySign).toBe("abc");
  });

  it("calculates order price", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 1,
        msg: "ok",
        result: {
          productAmount: 99,
          deliveryFee: 10,
          couponAmount: 0,
          vipAmount: 0,
          payAmount: 109,
        },
      },
    });

    const result = await calculateOrderPrice("token-1", "box-1", "addr-1", 5);
    expect(result.payAmount).toBe(109);
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box-order/calculate",
      expect.objectContaining({
        baseOrder: { addressId: "addr-1", remark: expect.any(String) },
        items: [{ mysteryBoxId: "box-1", mysteryBoxCount: 5 }],
      }),
      {
        headers: { token: "token-1" },
        params: expect.objectContaining({ autoCoupon: true }),
      },
    );
  });

  it("confirms receive for user", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: "order-123" },
    });
    const result = await confirmReceiveOrder("token-1", "order-123");
    expect(result).toBe("order-123");
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box-order/order-123/confirm-receive/user",
      {},
      { headers: { token: "token-1" } },
    );
  });

  it("redeems order to balance", async () => {
    postMock.mockResolvedValueOnce({
      data: { code: 1, msg: "ok", result: 88.5 },
    });
    const result = await redeemOrderToBalance("token-1", "order-123");
    expect(result).toBe(88.5);
    expect(postMock).toHaveBeenCalledWith(
      "/front/mystery-box-order/order-123/redeem/balance",
      {},
      {
        headers: expect.objectContaining({
          token: "token-1",
          // Redeem is money-moving, so a retry must not credit the balance twice.
          "x-idempotency-key": "order-123",
        }),
      },
    );
  });
});

