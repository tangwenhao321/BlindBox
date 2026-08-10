import { useEffect, useState } from "react";
import { StyleSheet, Text, type TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { usePayCountdown } from "../../hooks/usePayCountdown";
import { fetchOrderPaymentMeta } from "../../services/orderPaymentService";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  deadlineIso?: string | null;
  orderId?: string;
  authToken?: string;
  prefix?: string;
  expiredLabel?: string;
  style?: TextStyle;
};

export function PayCountdownText({
  deadlineIso: deadlineProp,
  orderId,
  authToken,
  prefix,
  expiredLabel,
  style,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildPayCountdownStyles);
  const prefixText = prefix ?? t("payment.pendingCountdownPrefix");
  const expiredText = expiredLabel ?? t("payment.pendingCountdownExpired");
  const [fetchedDeadline, setFetchedDeadline] = useState<string | null>(null);

  useEffect(() => {
    if (deadlineProp || !orderId || !authToken) {
      setFetchedDeadline(null);
      return;
    }
    let cancelled = false;
    void fetchOrderPaymentMeta(authToken, orderId).then((meta) => {
      if (!cancelled) setFetchedDeadline(meta?.payDeadline ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [deadlineProp, orderId, authToken]);

  const deadlineIso = deadlineProp ?? fetchedDeadline;
  const { label, expired } = usePayCountdown(deadlineIso);

  if (!deadlineIso) return null;

  return (
    <Text style={[styles.text, expired ? styles.expired : null, style]} accessibilityRole="timer">
      {expired ? expiredText : `${prefixText} ${label}`}
    </Text>
  );
}

function buildPayCountdownStyles(colors: ThemeColors) {
  return StyleSheet.create({
    text: { fontSize: typography.caption, fontWeight: "700", color: colors.accent },
    expired: { color: colors.danger },
  });
}
