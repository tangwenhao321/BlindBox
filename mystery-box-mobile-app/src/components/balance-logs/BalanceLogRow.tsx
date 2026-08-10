import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useScreenStyles } from "../../styles/screenStyles";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { formatCurrency } from "../../utils/formatCurrency";
import type { UserBalanceLog } from "../../types";

type Props = { item: UserBalanceLog };

function BalanceLogRowInner({ item }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBalanceLogRowStyles);
  const screenStyles = useScreenStyles();
  const amount = Number(item.amount ?? 0);
  const balanceAfter = Number(item.balanceAfter ?? 0);

  return (
    <View style={screenStyles.screenCard}>
      <Text style={styles.amount}>+{formatCurrency(amount)}</Text>
      <Text style={screenStyles.hintText}>{t("balanceLogs.rowType", { value: item.changeType || "-" })}</Text>
      <Text style={screenStyles.hintText}>{t("balanceLogs.rowBalanceAfter", { amount: formatCurrency(balanceAfter) })}</Text>
      <Text style={screenStyles.hintText}>{t("balanceLogs.rowOrder", { value: item.relatedOrderId || "-" })}</Text>
      <Text style={screenStyles.hintText}>{t("balanceLogs.rowTime", { value: item.createdTime || "-" })}</Text>
    </View>
  );
}

export const BalanceLogRow = memo(BalanceLogRowInner);

function buildBalanceLogRowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    amount: { color: colors.success, fontWeight: "800", fontSize: typography.bodyLg },
  });
}
