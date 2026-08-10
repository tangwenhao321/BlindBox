import { describe, expect, it } from "vitest";
import { formatOrderIdDisplay, formatOrderIdShort, getOrderBoxCover, getOrderStatusLabel, isUnpaidOrder } from "./order-utils";
import type { Order } from "./types";

describe("getOrderStatusLabel", () => {
  it("maps known status to Chinese label", () => {
    expect(getOrderStatusLabel("TO_BE_PAID")).toBe("待支付");
  });

  it("falls back to raw status for unknown status", () => {
    expect(getOrderStatusLabel("CUSTOM_STATUS")).toBe("CUSTOM_STATUS");
  });
});

describe("isUnpaidOrder", () => {
  it("returns true only for TO_BE_PAID", () => {
    expect(isUnpaidOrder({ id: "1", status: "TO_BE_PAID" } as Order)).toBe(true);
    expect(isUnpaidOrder({ id: "2", status: "FINISHED" } as Order)).toBe(false);
  });
});

describe("formatOrderIdDisplay", () => {
  it("returns digits-only display id", () => {
    expect(formatOrderIdDisplay("ORD-2026-00123")).toBe("202600123");
    expect(formatOrderIdDisplay("f974a74a-a45f-442d-a4ce-c93325f5793a")).toMatch(/^\d+$/);
  });
});

describe("formatOrderIdShort", () => {
  it("returns full numeric id when within max length", () => {
    expect(formatOrderIdShort("123456789012")).toBe("123456789012");
  });

  it("keeps trailing digits when id is longer than max", () => {
    expect(formatOrderIdShort("1234567890123456789", 12)).toBe("890123456789");
  });
});

describe("getOrderBoxCover", () => {
  it("resolves cover from order item snapshot", () => {
    const uri = getOrderBoxCover({
      id: "o1",
      status: "FINISHED",
      items: [
        {
          mysteryBoxId: "box-1",
          mysteryBox: { id: "box-1", name: "测试盒", cover: "/uploads/box.png" },
        },
      ],
    } as Order);
    expect(uri).toContain("/uploads/box.png");
  });
});

