import { describe, expect, it } from "vitest";
import {
  applyPaymentSuccessToOrderResult,
  orderResultFromCreated,
  resolveBoxForOrderRetry,
} from "./orderResultState";

describe("orderResultState", () => {
  it("orderResultFromCreated marks pending payment", () => {
    const result = orderResultFromCreated({
      orderId: "o1",
      boxName: "Box",
      drawCount: 2,
      payAmount: 19.9,
    });
    expect(result.pendingPayment).toBe(true);
    expect(result.prizes).toEqual([]);
  });

  it("applyPaymentSuccessToOrderResult updates matching order only", () => {
    const prev = orderResultFromCreated({
      orderId: "o1",
      boxName: "Box",
      drawCount: 1,
      payAmount: 9.9,
    });
    const prizes = [{ id: "p1", name: "A", price: 1, qualityType: "LEGEND" }];
    const next = applyPaymentSuccessToOrderResult(prev, "o1", prizes);
    expect(next).not.toBeNull();
    expect(next!.pendingPayment).toBe(false);
    expect(next!.revealPlaybackKey).toBe(1);
    expect(next!.prizes).toHaveLength(1);

    const unchanged = applyPaymentSuccessToOrderResult(prev, "other", prizes);
    expect(unchanged).toBe(prev);
  });

  it("rebuilds order result from order snapshot when modal state is missing", () => {
    const order = {
      id: "o2",
      status: "TO_BE_DELIVERED",
      items: [
        {
          mysteryBoxCount: 1,
          mysteryBox: { id: "b1", name: "Demo Box", cover: "/c.png" },
          products: [{ name: "Prize A", price: 1 }],
        },
      ],
      baseOrder: { payment: { payAmount: 12 } },
    } as import("../types").Order;
    const next = applyPaymentSuccessToOrderResult(null, "o2", [{ id: "p1", name: "Prize A", price: 1 }], 1, order);
    expect(next?.pendingPayment).toBe(false);
    expect(next?.revealPlaybackKey).toBe(1);
    expect(next?.boxName).toBe("Demo Box");
    expect(next?.prizes).toHaveLength(1);
  });

  it("resolveBoxForOrderRetry rebuilds box from order result when activeBox missing", () => {
    const orderResult = orderResultFromCreated({
      orderId: "o1",
      boxName: "Hot Box",
      boxId: "b-hot",
      boxCover: "/c.png",
      drawCount: 5,
      payAmount: 49.5,
    });
    const box = resolveBoxForOrderRetry(null, orderResult);
    expect(box?.id).toBe("b-hot");
    expect(box?.name).toBe("Hot Box");
    expect(box?.cover).toBe("/c.png");
    expect(box?.price).toBeCloseTo(9.9);
  });

  it("fills boxCover from order snapshot when missing on create", () => {
    const prev = orderResultFromCreated({
      orderId: "o1",
      boxName: "Box",
      drawCount: 1,
      payAmount: 9.9,
    });
    const order = {
      id: "o1",
      status: "TO_BE_DELIVERED",
      items: [{ mysteryBox: { id: "b1", name: "Box", cover: "/uploads/x.png" } }],
    };
    const next = applyPaymentSuccessToOrderResult(prev, "o1", [], 1, order as import("../types").Order);
    expect(next!.boxCover).toContain("/uploads/x.png");
  });
});
