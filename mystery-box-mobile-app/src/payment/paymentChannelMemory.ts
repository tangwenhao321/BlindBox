/** Last payment channel used in this session (for success analytics). */
export type PaymentChannel = "wechat" | "vnpay" | "momo" | "mock";

let lastPaymentChannel: PaymentChannel = "vnpay";

export function rememberPaymentChannel(channel: PaymentChannel) {
  lastPaymentChannel = channel;
}

export function getLastPaymentChannel(): PaymentChannel {
  return lastPaymentChannel;
}
