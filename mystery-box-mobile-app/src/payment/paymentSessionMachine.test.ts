import { describe, expect, it } from "vitest";
import {
  initialPaymentSessionMachineState,
  reducePaymentSessionMachine,
} from "./paymentSessionMachine";

describe("paymentSessionMachine", () => {
  it("opens mock pay and clears prepay", () => {
    const next = reducePaymentSessionMachine(initialPaymentSessionMachineState, {
      type: "OPEN_MOCK_PAY",
      orderId: "o1",
      payAmount: 9.9,
    });
    expect(next.paymentSession).toEqual({ orderId: "o1", payAmount: 9.9 });
    expect(next.prepaySession).toBeNull();
  });

  it("resets all sessions", () => {
    const open = reducePaymentSessionMachine(initialPaymentSessionMachineState, {
      type: "OPEN_PREPAY",
      orderId: "o2",
      payAmount: 1,
    });
    expect(reducePaymentSessionMachine(open, { type: "RESET" })).toEqual(
      initialPaymentSessionMachineState,
    );
  });
});
