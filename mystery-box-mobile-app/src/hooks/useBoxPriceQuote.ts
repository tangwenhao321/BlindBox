import { useEffect, useState } from "react";
import { parseError } from "../api";
import { calculateOrderPrice } from "../services/orderService";
import { getRetentionOrderId } from "../utils/retentionStorage";
import type { PaymentPriceView } from "../types";

export function useBoxPriceQuote(
  token: string,
  boxId: string | undefined,
  addressId: string,
  drawCount: number,
  couponUserId?: string,
) {
  const [quote, setQuote] = useState<PaymentPriceView | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !boxId || drawCount < 1) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setQuoteError(null);
    void getRetentionOrderId().then((retentionOrderId) =>
      calculateOrderPrice(token, boxId, addressId || undefined, drawCount, couponUserId || undefined, retentionOrderId)
        .then((result) => {
          if (!cancelled) setQuote(result);
        })
        .catch((error) => {
          if (!cancelled) {
            setQuote(null);
            setQuoteError(parseError(error));
          }
        })
        .finally(() => {
          if (!cancelled) setQuoting(false);
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [token, boxId, addressId, drawCount, couponUserId]);

  return { quote, quoting, quoteError };
}
