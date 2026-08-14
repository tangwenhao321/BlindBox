import { Text, View, type TextStyle } from "react-native";
import { PayCountdownText } from "../ui/PayCountdownText";

type StatusTheme = { bg: string; text: string; border: string };

type Props = {
  statusLabel: string;
  statusTheme: StatusTheme;
  payAmountText: string;
  canPay: boolean;
  authToken?: string | null;
  orderId: string;
  countdownPrefix: string;
  countdownExpiredLabel: string;
  styles: {
    statusRow: object;
    statusChip: object;
    payAmount: object;
    payDeadline: TextStyle;
  };
};

export function OrderDetailsHeader({
  statusLabel,
  statusTheme,
  payAmountText,
  canPay,
  authToken,
  orderId,
  countdownPrefix,
  countdownExpiredLabel,
  styles,
}: Props) {
  return (
    <>
      <View style={styles.statusRow}>
        <Text
          style={[
            styles.statusChip,
            { backgroundColor: statusTheme.bg, color: statusTheme.text, borderColor: statusTheme.border },
          ]}
        >
          {statusLabel}
        </Text>
        <Text style={styles.payAmount}>{payAmountText}</Text>
      </View>
      {canPay && authToken ? (
        <PayCountdownText
          authToken={authToken}
          orderId={orderId}
          prefix={countdownPrefix}
          expiredLabel={countdownExpiredLabel}
          style={styles.payDeadline}
        />
      ) : null}
    </>
  );
}
