import { useTranslation } from "react-i18next";

/** Shared copy for unpaid-order countdown across banner, order detail, and result sheet. */
export function usePendingPaymentCountdownLabels() {
  const { t } = useTranslation();
  return {
    prefix: t("payment.pendingCountdownPrefix"),
    expiredLabel: t("payment.pendingCountdownExpired"),
  };
}
