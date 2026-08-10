import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCouponsQuery } from "../query/hooks/useCouponsQuery";
import type { CouponItem, PaymentPriceView } from "../types";

export function useAppCouponSelection(token: string) {
  const { data: coupons = [], refetch } = useCouponsQuery(token);
  const availableCoupons = useMemo(() => coupons as CouponItem[], [coupons]);
  const [selectedCouponUserId, setSelectedCouponUserIdState] = useState("");
  const manualSelection = useRef(false);

  const loadAvailableCoupons = useCallback(async () => {
    if (!token) return;
    await refetch();
  }, [refetch, token]);

  useEffect(() => {
    if (!token) {
      setSelectedCouponUserIdState("");
      manualSelection.current = false;
      return;
    }
    setSelectedCouponUserIdState((current) => {
      if (manualSelection.current && current && availableCoupons.some((c) => c.id === current)) {
        return current;
      }
      if (current && !availableCoupons.some((c) => c.id === current)) {
        manualSelection.current = false;
        return "";
      }
      if (current || availableCoupons.length === 0) {
        return current;
      }
      const best = [...availableCoupons].sort(
        (a, b) => Number(b.amount ?? b.coupon?.amount ?? 0) - Number(a.amount ?? a.coupon?.amount ?? 0),
      )[0];
      return best?.id ?? "";
    });
  }, [availableCoupons, token]);

  const applySuggestedCouponFromQuote = useCallback((quote: PaymentPriceView | null | undefined) => {
    const suggested = quote?.suggestedCouponUserId;
    if (!suggested) return;
    if (manualSelection.current) return;
    setSelectedCouponUserIdState((current) => (current === suggested ? current : suggested));
  }, []);

  const selectCouponUserId = useCallback((id: string) => {
    manualSelection.current = true;
    setSelectedCouponUserIdState(id);
  }, []);

  const resetCouponSelection = useCallback(() => {
    manualSelection.current = false;
    setSelectedCouponUserIdState("");
  }, []);

  return {
    availableCoupons,
    selectedCouponUserId,
    setSelectedCouponUserId: selectCouponUserId,
    loadAvailableCoupons,
    resetCouponSelection,
    applySuggestedCouponFromQuote,
  };
}
