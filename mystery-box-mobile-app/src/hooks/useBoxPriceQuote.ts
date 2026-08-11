import { useCallback, useEffect, useState } from "react";
import { parseError } from "../api";
import { calculateOrderPrice } from "../services/orderService";
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
  const [retryNonce, setRetryNonce] = useState(0);

  const retryQuote = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!token || !boxId || drawCount < 1) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setQuoteError(null);
    // Retention is original-order only — never fold a prior claim into a new cart quote.
    void calculateOrderPrice(token, boxId, addressId || undefined, drawCount, couponUserId || undefined, null)
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
      });
    return () => {
      cancelled = true;
    };
  }, [token, boxId, addressId, drawCount, couponUserId, retryNonce]);

  return { quote, quoting, quoteError, retryQuote };
}
