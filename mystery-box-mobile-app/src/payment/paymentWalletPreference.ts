/** Selected wallet at checkout — consumed when initiating payment. */
let pendingWallet: "default" | "momo" = "default";

export function setPendingPaymentWallet(wallet: "default" | "momo") {
  pendingWallet = wallet;
}

export function peekPendingPaymentWallet(): "default" | "momo" {
  return pendingWallet;
}

export function consumePendingPaymentWallet(): "default" | "momo" {
  const wallet = pendingWallet;
  pendingWallet = "default";
  return wallet;
}
