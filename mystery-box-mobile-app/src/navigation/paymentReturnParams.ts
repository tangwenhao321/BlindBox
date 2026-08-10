type PaymentReturnParams = {
  orderId: string;
  paymentResponseCode?: string;
};

let pending: PaymentReturnParams | null = null;

export function setPaymentReturnParams(params: PaymentReturnParams) {
  pending = params;
}

export function peekPaymentReturnParams(): PaymentReturnParams | null {
  return pending;
}

export function clearPaymentReturnParams() {
  pending = null;
}
