import { useCallback, useEffect, useState } from "react";
import { parseError } from "../api";
import { fetchOrderTracking, type LogisticsEvent } from "../services/logisticsService";
import { queryMyRefunds, type RefundRecord } from "../services/refundService";

type SectionState = {
  loading: boolean;
  error: string | null;
};

export function useOrderDetailsAuxiliary(
  authToken: string | undefined,
  orderId: string,
  _orderStatus: string,
  trackingNumber?: string,
) {
  const [logistics, setLogistics] = useState<LogisticsEvent[]>([]);
  const [carrierCode, setCarrierCode] = useState<string | null>(null);
  const [logisticsSection, setLogisticsSection] = useState<SectionState>({ loading: false, error: null });

  const [refundRecord, setRefundRecord] = useState<RefundRecord | null>(null);
  const [refundSection, setRefundSection] = useState<SectionState>({ loading: false, error: null });

  const reload = useCallback(async () => {
    if (!authToken) return;

    if (trackingNumber) {
      setLogisticsSection({ loading: true, error: null });
      try {
        const result = await fetchOrderTracking(authToken, orderId);
        setLogistics(result.events ?? []);
        setCarrierCode(result.carrierCode ?? null);
        setLogisticsSection({ loading: false, error: null });
      } catch (error) {
        setLogistics([]);
        setCarrierCode(null);
        setLogisticsSection({ loading: false, error: parseError(error) });
      }
    } else {
      setLogistics([]);
      setCarrierCode(null);
      setLogisticsSection({ loading: false, error: null });
    }

    setRefundSection({ loading: true, error: null });
    try {
      const rows = await queryMyRefunds(authToken);
      setRefundRecord(rows.find((r) => r.orderId === orderId) ?? null);
      setRefundSection({ loading: false, error: null });
    } catch (error) {
      setRefundRecord(null);
      setRefundSection({ loading: false, error: parseError(error) });
    }
  }, [authToken, orderId, trackingNumber]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    logistics,
    carrierCode,
    logisticsLoading: logisticsSection.loading,
    logisticsError: logisticsSection.error,
    refundRecord,
    refundLoading: refundSection.loading,
    refundError: refundSection.error,
    reloadAuxiliary: reload,
  };
}
