import { Clipboard, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ORDER_STATUS } from "../../config/constants";
import { formatOrderIdDisplay, getOrderBoxName, getOrderTimeLabel } from "../../order-utils";
import { formatCurrency, formatCurrencyDiscount } from "../../utils/formatCurrency";
import { toast } from "../../utils/toast";
import { InlineSectionError } from "../ui/InlineSectionError";
import { ListSkeleton } from "../ListSkeleton";
import { openContactSupport } from "../../utils/contactSupport";
import { SummaryRow } from "./SummaryRow";
import type { Order } from "../../types";

type LogisticsEvent = {
  status?: string;
  description: string;
  source?: string;
};

type Props = {
  order: Order;
  carrierLabel: string | null;
  trackingNumber?: string | null;
  logistics: LogisticsEvent[];
  logisticsLoading: boolean;
  logisticsError: string | null;
  reloadAuxiliary: () => void;
  styles: Record<string, object>;
};

export function OrderDetailsTimeline({
  order,
  carrierLabel,
  trackingNumber,
  logistics,
  logisticsLoading,
  logisticsError,
  reloadAuxiliary,
  styles,
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.summaryCard}>
      <SummaryRow styles={styles as never} label={t("orderDetails.boxLabel")} value={getOrderBoxName(order)} />
      <SummaryRow styles={styles as never} label={t("orderDetails.orderTime")} value={getOrderTimeLabel(order)} />
      <SummaryRow
        styles={styles as never}
        label={t("orderDetails.quantity")}
        value={String(order.items?.[0]?.mysteryBoxCount ?? "—")}
      />
      {order.baseOrder?.payment?.couponAmount ? (
        <SummaryRow
          styles={styles as never}
          label={t("orderDetails.couponLabel")}
          value={formatCurrencyDiscount(order.baseOrder.payment.couponAmount)}
        />
      ) : null}
      {order.baseOrder?.payment?.deliveryFee != null && order.baseOrder.payment.deliveryFee > 0.009 ? (
        <SummaryRow
          styles={styles as never}
          label={t("orderDetails.deliveryFee")}
          value={formatCurrency(order.baseOrder.payment.deliveryFee)}
        />
      ) : null}
      <View style={styles.idRow}>
        <Text style={styles.idLabel}>{t("orderDetails.orderId")}</Text>
        <Pressable
          onPress={() => {
            Clipboard.setString(order.id);
            toast.success(t("orderDetails.orderIdCopied"));
          }}
          accessibilityRole="button"
          accessibilityLabel={t("orderDetails.copy")}
        >
          <Text style={styles.idValue}>
            {formatOrderIdDisplay(order.id)} {t("orderDetails.copy")}
          </Text>
        </Pressable>
      </View>
      {trackingNumber ? (
        <>
          {carrierLabel ? (
            <SummaryRow styles={styles as never} label={t("orderDetails.carrierLabel")} value={carrierLabel} />
          ) : null}
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>{t("orderDetails.trackingNo")}</Text>
            <Pressable
              onPress={() => {
                Clipboard.setString(trackingNumber);
                toast.success(t("orderDetails.trackingCopied"));
              }}
              accessibilityRole="button"
              accessibilityLabel={t("orderDetails.copyTrackingA11y")}
            >
              <Text style={styles.idValue}>
                {trackingNumber} · {t("orderDetails.copy")}
              </Text>
            </Pressable>
          </View>
          <View style={styles.logisticsCard}>
            <Text style={styles.logisticsTitle}>{t("orderDetails.logisticsTimeline")}</Text>
            {logisticsLoading ? <ListSkeleton variant="row" rows={2} /> : null}
            {logisticsError ? (
              <InlineSectionError
                message={t("orderDetails.logisticsLoadFailed", { message: logisticsError })}
                onRetry={() => void reloadAuxiliary()}
                onContactSupport={() => void openContactSupport()}
              />
            ) : null}
            {!logisticsLoading && !logisticsError
              ? (logistics.length ? logistics : []).map((event, index) => {
                  const sourceLabel =
                    event.source === "KUAIDI100"
                      ? t("orderDetails.logisticsSourceKuaidi100")
                      : event.source === "MANUAL"
                        ? t("orderDetails.logisticsSourceManual")
                        : event.source
                          ? t("orderDetails.logisticsSourceLocal")
                          : null;
                  return (
                    <Text key={`${event.status}-${index}`} style={styles.logisticsStep}>
                      {index === 0 ? "●" : "○"} {event.description}
                      {sourceLabel ? ` · ${sourceLabel}` : null}
                    </Text>
                  );
                })
              : null}
            {!logisticsLoading && !logisticsError && !logistics.length ? (
              <Text style={styles.logisticsStep}>● {t("orderDetails.logisticsInTransit")}</Text>
            ) : null}
            <Text style={styles.logisticsHint}>
              {logistics.some((e) => e.source === "KUAIDI100")
                ? t("orderDetails.logisticsMerged")
                : t("orderDetails.logisticsManual")}
            </Text>
          </View>
        </>
      ) : order.status === ORDER_STATUS.TO_BE_RECEIVED || order.status === ORDER_STATUS.TO_BE_DELIVERED ? (
        <SummaryRow
          styles={styles as never}
          label={t("orderDetails.logisticsLabel")}
          value={t("orderDetails.logisticsPending")}
        />
      ) : null}
    </View>
  );
}
