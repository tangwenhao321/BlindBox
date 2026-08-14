import { Text, View, type TextStyle, type ViewStyle } from "react-native";

export function SummaryRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: {
    summaryRow: ViewStyle;
    summaryLabel: TextStyle;
    summaryValue: TextStyle;
  };
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}
