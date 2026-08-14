import * as Haptics from "expo-haptics";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "../ui/PrimaryButton";

type Props = {
  canPay: boolean;
  canApplyRefund: boolean;
  canConfirmReceive: boolean;
  canCancel: boolean;
  refundSubmitting: boolean;
  pendingPayment: boolean;
  hasPrizes: boolean;
  onPay: () => void;
  onRefund: () => void;
  onConfirmReceive: () => void;
  onCancel: () => void;
  confirmReceive: (opts: {
    title: string;
    message: string;
    confirmLabel: string;
  }) => Promise<boolean>;
  styles: Record<string, object>;
};

export function OrderDetailsActions({
  canPay,
  canApplyRefund,
  canConfirmReceive,
  canCancel,
  refundSubmitting,
  pendingPayment,
  hasPrizes,
  onPay,
  onRefund,
  onConfirmReceive,
  onCancel,
  confirmReceive,
  styles,
}: Props) {
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.actions}>
        {canPay ? (
          <PrimaryButton
            label={t("orderDetails.payNow")}
            accessibilityLabel={t("orderDetails.payNowA11y")}
            onPress={() => void onPay()}
          />
        ) : null}
        {canApplyRefund ? (
          <PrimaryButton
            label={refundSubmitting ? t("common.loading", { defaultValue: "…" }) : t("orderDetails.applyRefund")}
            variant="ghost"
            disabled={refundSubmitting}
            onPress={() => void onRefund()}
          />
        ) : null}
        {canConfirmReceive ? (
          <PrimaryButton
            label={t("orderDetails.confirmReceive")}
            onPress={async () => {
              const ok = await confirmReceive({
                title: t("orderDetails.confirmReceiveTitle"),
                message: t("orderDetails.confirmReceiveMessage"),
                confirmLabel: t("orderDetails.confirmReceive"),
              });
              if (ok) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onConfirmReceive();
              }
            }}
          />
        ) : null}
        {canCancel ? (
          <PrimaryButton label={t("orderDetails.cancelUnpaid")} variant="ghost" onPress={onCancel} />
        ) : null}
      </View>
      {pendingPayment && hasPrizes ? (
        <Text style={styles.pendingPaymentHint}>{t("orderDetails.pendingPaymentHint")}</Text>
      ) : null}
    </>
  );
}
