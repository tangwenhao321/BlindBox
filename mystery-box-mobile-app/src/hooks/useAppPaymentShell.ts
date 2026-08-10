import { useCallback, useReducer, useState } from "react";
import type { OrderResultState } from "./buildAppModalsProps";
import { sumOrderDrawCount } from "../effects/normalize";
import { applyPaymentSuccessToOrderResult, orderResultFromCreated } from "./orderResultState";
import { usePendingPayment } from "./usePendingPayment";
import {
  initialPaymentSessionMachineState,
  reducePaymentSessionMachine,
} from "../payment/paymentSessionMachine";
import type { Order, PrepayResult, Product, VNPayPrepayResult, MoMoPrepayResult } from "../types";

export type PaymentErrorSession = {
  orderId: string;
  payAmount: number;
  message: string;
  channel: "wechat" | "vnpay" | "momo";
};

export type OrderCreatedPayload = {
  orderId: string;
  boxName: string;
  boxId?: string;
  boxCategoryName?: string;
  boxCover?: string;
  drawCount: number;
  payAmount: number;
};

export function useAppPaymentShell(token: string, orders: Order[]) {
  const [sessionMachine, dispatchSession] = useReducer(
    reducePaymentSessionMachine,
    initialPaymentSessionMachineState,
  );
  const [prepayDetail, setPrepayDetail] = useState<PrepayResult | null>(null);
  const [vnpayDetail, setVnpayDetail] = useState<VNPayPrepayResult | null>(null);
  const [momoSession, setMomoSessionState] = useState<{
    orderId: string;
    payAmount: number;
    prepay: MoMoPrepayResult;
  } | null>(null);
  const [paymentErrorSession, setPaymentErrorSession] = useState<PaymentErrorSession | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResultState>(null);
  const [sharePosterVisible, setSharePosterVisible] = useState(false);
  const pendingPayment = usePendingPayment(token, orders);

  const setPaymentSession = useCallback((session: { orderId: string; payAmount: number } | null) => {
    if (session) {
      dispatchSession({
        type: "OPEN_MOCK_PAY",
        orderId: session.orderId,
        payAmount: session.payAmount,
      });
      return;
    }
    dispatchSession({ type: "CLOSE_PAYMENT" });
  }, []);

  const setPrepaySession = useCallback(
    (session: { orderId: string; payAmount: number; prepay: PrepayResult } | null) => {
      if (session) {
        dispatchSession({
          type: "OPEN_PREPAY",
          orderId: session.orderId,
          payAmount: session.payAmount,
        });
        setPrepayDetail(session.prepay);
        return;
      }
      dispatchSession({ type: "CLOSE_PREPAY" });
      setPrepayDetail(null);
    },
    [],
  );

  const setVnpaySession = useCallback(
    (session: { orderId: string; payAmount: number; prepay: VNPayPrepayResult } | null) => {
      if (session) {
        dispatchSession({
          type: "OPEN_VNPAY",
          orderId: session.orderId,
          payAmount: session.payAmount,
        });
        setVnpayDetail(session.prepay);
        return;
      }
      dispatchSession({ type: "CLOSE_VNPAY" });
      setVnpayDetail(null);
    },
    [],
  );

  const setMomoSession = useCallback(
    (session: { orderId: string; payAmount: number; prepay: MoMoPrepayResult } | null) => {
      setMomoSessionState(session);
    },
    [],
  );

  const resetPaymentSessions = useCallback(() => {
    dispatchSession({ type: "RESET" });
    setPrepayDetail(null);
    setVnpayDetail(null);
    setMomoSessionState(null);
    setPaymentErrorSession(null);
  }, []);

  const onOrderCreated = useCallback(
    (payload: OrderCreatedPayload) => {
      void pendingPayment.onOrderCreated(payload);
      setOrderResult(orderResultFromCreated(payload));
    },
    [pendingPayment],
  );

  const onPaymentSuccess = useCallback(async () => {
    await pendingPayment.onPaymentSuccess();
    resetPaymentSessions();
  }, [pendingPayment, resetPaymentSessions]);

  const onCancelUnpaid = useCallback(async () => {
    await pendingPayment.onCancelUnpaid();
    resetPaymentSessions();
  }, [pendingPayment, resetPaymentSessions]);

  const markOrderResultPaid = useCallback((orderId: string, prizes: Product[], order?: Order) => {
    const drawCount = order ? sumOrderDrawCount(order) : undefined;
    setOrderResult((prev) => applyPaymentSuccessToOrderResult(prev, orderId, prizes, drawCount, order));
  }, []);

  const prepaySession =
    sessionMachine.prepaySession && prepayDetail
      ? { ...sessionMachine.prepaySession, prepay: prepayDetail }
      : null;

  const vnpaySession =
    sessionMachine.vnpaySession && vnpayDetail
      ? { ...sessionMachine.vnpaySession, prepay: vnpayDetail }
      : null;

  return {
    paymentSession: sessionMachine.paymentSession,
    setPaymentSession,
    prepaySession,
    setPrepaySession,
    vnpaySession,
    setVnpaySession,
    momoSession,
    setMomoSession,
    paymentErrorSession,
    setPaymentErrorSession,
    resetPaymentSessions,
    orderResult,
    setOrderResult,
    sharePosterVisible,
    setSharePosterVisible,
    onOrderCreated,
    onPaymentSuccess,
    onCancelUnpaid,
    markOrderResultPaid,
  };
}
