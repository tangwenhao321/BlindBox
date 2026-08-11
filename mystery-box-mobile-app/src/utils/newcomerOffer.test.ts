import { describe, expect, it } from "vitest";
import { ORDER_STATUS } from "../config/constants";
import {
  getNewcomerBarPrice,
  getNewcomerFallbackPrice,
  hasOpenedBlindBox,
  shouldShowNewcomerOffer,
} from "./newcomerOffer";
import type { MysteryBox, Order } from "../types";

describe("newcomerOffer", () => {
  it("hasOpenedBlindBox is false for unpaid-only orders", () => {
    const orders: Order[] = [{ id: "1", status: ORDER_STATUS.TO_BE_PAID }];
    expect(hasOpenedBlindBox(orders)).toBe(false);
  });

  it("hasOpenedBlindBox is true after delivery status", () => {
    const orders: Order[] = [{ id: "1", status: ORDER_STATUS.TO_BE_DELIVERED }];
    expect(hasOpenedBlindBox(orders)).toBe(true);
  });

  it("shouldShowNewcomerOffer respects session dismiss", () => {
    expect(shouldShowNewcomerOffer([], false)).toBe(true);
    expect(shouldShowNewcomerOffer([], true)).toBe(false);
  });

  it("shouldShowNewcomerOffer is false after user has opened a box", () => {
    const orders: Order[] = [{ id: "1", status: ORDER_STATUS.TO_BE_DELIVERED }];
    expect(shouldShowNewcomerOffer(orders, false)).toBe(false);
  });

  it("getNewcomerBarPrice uses exclusive box price or fallback", () => {
    const boxes: MysteryBox[] = [
      { id: "1", name: "Regular", price: 99 } as MysteryBox,
      { id: "2", name: "Newcomer", price: 0.01, newcomerExclusive: true } as MysteryBox,
    ];
    expect(getNewcomerBarPrice(boxes)).toBe(0.01);
    expect(getNewcomerBarPrice([{ id: "3", name: "Regular", price: 50 } as MysteryBox])).toBe(
      getNewcomerFallbackPrice(),
    );
  });
});
