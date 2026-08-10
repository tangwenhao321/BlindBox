export type PaymentSessionSnapshot = {
  orderId: string;
  payAmount: number;
} | null;

export type PrepaySessionSnapshot = {
  orderId: string;
  payAmount: number;
} | null;

export type VnpaySessionSnapshot = {
  orderId: string;
  payAmount: number;
} | null;

export type PaymentSessionMachineState = {
  paymentSession: PaymentSessionSnapshot;
  prepaySession: PrepaySessionSnapshot;
  vnpaySession: VnpaySessionSnapshot;
};

export type PaymentSessionEvent =
  | { type: "OPEN_MOCK_PAY"; orderId: string; payAmount: number }
  | { type: "OPEN_PREPAY"; orderId: string; payAmount: number }
  | { type: "OPEN_VNPAY"; orderId: string; payAmount: number }
  | { type: "CLOSE_PAYMENT" }
  | { type: "CLOSE_PREPAY" }
  | { type: "CLOSE_VNPAY" }
  | { type: "RESET" };

export const initialPaymentSessionMachineState: PaymentSessionMachineState = {
  paymentSession: null,
  prepaySession: null,
  vnpaySession: null,
};

export function reducePaymentSessionMachine(
  state: PaymentSessionMachineState,
  event: PaymentSessionEvent,
): PaymentSessionMachineState {
  switch (event.type) {
    case "OPEN_MOCK_PAY":
      return {
        paymentSession: { orderId: event.orderId, payAmount: event.payAmount },
        prepaySession: null,
        vnpaySession: null,
      };
    case "OPEN_PREPAY":
      return {
        paymentSession: null,
        prepaySession: { orderId: event.orderId, payAmount: event.payAmount },
        vnpaySession: null,
      };
    case "OPEN_VNPAY":
      return {
        paymentSession: null,
        prepaySession: null,
        vnpaySession: { orderId: event.orderId, payAmount: event.payAmount },
      };
    case "CLOSE_PAYMENT":
      return { ...state, paymentSession: null };
    case "CLOSE_PREPAY":
      return { ...state, prepaySession: null };
    case "CLOSE_VNPAY":
      return { ...state, vnpaySession: null };
    case "RESET":
      return initialPaymentSessionMachineState;
    default:
      return state;
  }
}

export function selectPaymentSession(state: PaymentSessionMachineState): PaymentSessionSnapshot {
  return state.paymentSession;
}

export function selectPrepaySession(state: PaymentSessionMachineState): PrepaySessionSnapshot {
  return state.prepaySession;
}

export function selectVnpaySession(state: PaymentSessionMachineState): VnpaySessionSnapshot {
  return state.vnpaySession;
}
