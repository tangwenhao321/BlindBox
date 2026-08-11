import { formatCurrency } from "./formatCurrency";

export function localizeRetentionMessage(
  t: (key: string, opts?: Record<string, unknown>) => string,
  message: string,
  discountAmount: number,
): string {
  if (message.startsWith("RETENTION_OFFER:ALREADY_CLAIMED")) {
    return t("payment.retentionAlreadyClaimed");
  }
  if (message.startsWith("RETENTION_OFFER:DAILY_LIMIT")) {
    return t("payment.retentionDailyLimit");
  }
  if (message.startsWith("RETENTION_OFFER:AMOUNT_TOO_LOW")) {
    return t("payment.retentionAmountTooLow");
  }
  if (message.startsWith("RETENTION_OFFER:DISABLED")) {
    return t("payment.retentionDisabled");
  }
  if (message.startsWith("RETENTION_OFFER:")) {
    return t("payment.retentionOffer", {
      amount: formatCurrency(discountAmount),
    });
  }
  return message;
}
