/** Bridges expo-router payment-return deep links to the legacy payment modal shell. */

let dismissVnpayCheckout: (() => void) | null = null;
let dismissMomoCheckout: (() => void) | null = null;
let confirmPaymentSuccess: ((orderId: string) => Promise<void>) | null = null;
let peekOrderResultForRoutes: (() => { orderId: string; boxId?: string } | null) | null = null;

export function registerPaymentShellBridge(handlers: {
  dismissVnpayCheckout: () => void;
  dismissMomoCheckout: () => void;
  confirmPaymentSuccess: (orderId: string) => Promise<void>;
  peekOrderResult?: () => { orderId: string; boxId?: string } | null;
}) {
  dismissVnpayCheckout = handlers.dismissVnpayCheckout;
  dismissMomoCheckout = handlers.dismissMomoCheckout;
  confirmPaymentSuccess = handlers.confirmPaymentSuccess;
  peekOrderResultForRoutes = handlers.peekOrderResult ?? null;
}

/** Active order-result modal context (for fairness verify when selectedOrder is unset). */
export function peekActiveOrderResult(): { orderId: string; boxId?: string } | null {
  return peekOrderResultForRoutes?.() ?? null;
}

export function dismissVnpayCheckoutModal() {
  dismissVnpayCheckout?.();
}

export function dismissMomoCheckoutModal() {
  dismissMomoCheckout?.();
}

/** Close payment modals and run the same post-pay flow as in-modal success. */
export async function settlePaymentFromReturn(orderId: string) {
  dismissVnpayCheckoutModal();
  dismissMomoCheckoutModal();
  if (confirmPaymentSuccess) {
    await confirmPaymentSuccess(orderId);
  }
}
