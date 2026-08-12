import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useScreenStyles } from "../../styles/screenStyles";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { formatCurrency, getAppCurrency } from "../../utils/formatCurrency";

type Props = {
  orderKeyword: string;
  startDate: string;
  endDate: string;
  quickRange: "" | "TODAY" | "7D" | "30D";
  minAmount: string;
  maxAmount: string;
  quickMin: string;
  pickerTarget: "start" | "end" | null;
  setOrderKeyword: (value: string) => void;
  setPickerTarget: (value: "start" | "end" | null) => void;
  setMinAmount: (value: string) => void;
  setMaxAmount: (value: string) => void;
  applyQuickRange: (value: "" | "TODAY" | "7D" | "30D") => void;
  applyQuickMin: (value: string) => void;
  applyPreset: (value: "FINANCE_DAILY" | "OPS_WEEKLY") => void;
  setQuickMin: (value: string) => void;
  parseDate: (value: string) => Date;
  onPickerChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
};

const QUICK_MINS = getAppCurrency() === "VND" ? (["10000", "50000", "100000"] as const) : (["10", "50", "100"] as const);

export function BalanceLogsFiltersSection(props: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBalanceFiltersStyles);
  const screenStyles = useScreenStyles();
  const amountChip = (value: string) => t("common.amountAtLeast", { amount: formatCurrency(Number(value)) });
  const {
    orderKeyword,
    startDate,
    endDate,
    quickRange,
    minAmount,
    maxAmount,
    quickMin,
    pickerTarget,
    setOrderKeyword,
    setPickerTarget,
    setMinAmount,
    setMaxAmount,
    applyQuickRange,
    applyQuickMin,
    applyPreset,
    setQuickMin,
    parseDate,
    onPickerChange,
  } = props;

  return (
    <>
      <View style={screenStyles.screenCard}>
        <Text style={screenStyles.sectionTitle}>{t("balanceLogs.filtersTitle")}</Text>
        <View style={styles.filterRow}>
          <TextInput
            value={orderKeyword}
            onChangeText={setOrderKeyword}
            placeholder={t("balanceLogs.orderKeywordPlaceholder")}
            style={screenStyles.input}
          />
          <Pressable
            style={screenStyles.input}
            accessibilityRole="button"
            accessibilityLabel={t("balanceLogs.pickStartDate")}
            onPress={() => setPickerTarget("start")}
          >
            <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
              {startDate || t("balanceLogs.pickStartDate")}
            </Text>
          </Pressable>
          <Pressable
            style={screenStyles.input}
            accessibilityRole="button"
            accessibilityLabel={t("balanceLogs.pickEndDate")}
            onPress={() => setPickerTarget("end")}
          >
            <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
              {endDate || t("balanceLogs.pickEndDate")}
            </Text>
          </Pressable>
          <View style={styles.quickRow}>
            <Text style={styles.hint}>{t("balanceLogs.quickTimeLabel")}</Text>
            <Pressable
              style={[screenStyles.chipBtn, quickRange === "TODAY" ? screenStyles.chipBtnActive : null]}
              accessibilityRole="button"
              accessibilityLabel={t("balanceLogs.quickToday")}
              onPress={() => applyQuickRange("TODAY")}
            >
              <Text style={[screenStyles.chipText, quickRange === "TODAY" ? screenStyles.chipTextActive : null]}>{t("balanceLogs.quickToday")}</Text>
            </Pressable>
            <Pressable
              style={[screenStyles.chipBtn, quickRange === "7D" ? screenStyles.chipBtnActive : null]}
              accessibilityRole="button"
              accessibilityLabel={t("balanceLogs.quick7d")}
              onPress={() => applyQuickRange("7D")}
            >
              <Text style={[screenStyles.chipText, quickRange === "7D" ? screenStyles.chipTextActive : null]}>{t("balanceLogs.quick7d")}</Text>
            </Pressable>
            <Pressable
              style={[screenStyles.chipBtn, quickRange === "30D" ? screenStyles.chipBtnActive : null]}
              accessibilityRole="button"
              accessibilityLabel={t("balanceLogs.quick30d")}
              onPress={() => applyQuickRange("30D")}
            >
              <Text style={[screenStyles.chipText, quickRange === "30D" ? screenStyles.chipTextActive : null]}>{t("balanceLogs.quick30d")}</Text>
            </Pressable>
            <Pressable
              style={[screenStyles.chipBtn, !quickRange ? screenStyles.chipBtnActive : null]}
              accessibilityRole="button"
              accessibilityLabel={t("balanceLogs.quickAll")}
              onPress={() => applyQuickRange("")}
            >
              <Text style={[screenStyles.chipText, !quickRange ? screenStyles.chipTextActive : null]}>{t("balanceLogs.quickAll")}</Text>
            </Pressable>
          </View>
          <TextInput
            value={minAmount}
            onChangeText={setMinAmount}
            placeholder={t("balanceLogs.minAmountPlaceholder")}
            keyboardType="decimal-pad"
            style={screenStyles.input}
          />
          <TextInput
            value={maxAmount}
            onChangeText={setMaxAmount}
            placeholder={t("balanceLogs.maxAmountPlaceholder")}
            keyboardType="decimal-pad"
            style={screenStyles.input}
          />
          <View style={styles.quickRow}>
            <Text style={styles.hint}>{t("balanceLogs.quickAmountLabel")}</Text>
            {QUICK_MINS.map((value) => (
              <Pressable
                key={value}
                style={[screenStyles.chipBtn, quickMin === value ? screenStyles.chipBtnActive : null]}
                accessibilityRole="button"
                accessibilityLabel={amountChip(value)}
                onPress={() => applyQuickMin(value)}
              >
                <Text style={[screenStyles.chipText, quickMin === value ? screenStyles.chipTextActive : null]}>
                  {amountChip(value)}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[screenStyles.chipBtn, !quickMin ? screenStyles.chipBtnActive : null]}
              accessibilityRole="button"
              accessibilityLabel={t("balanceLogs.quickAll")}
              onPress={() => {
                setQuickMin("");
                setMinAmount("");
                setMaxAmount("");
              }}
            >
              <Text style={[screenStyles.chipText, !quickMin ? screenStyles.chipTextActive : null]}>{t("balanceLogs.quickAll")}</Text>
            </Pressable>
          </View>
          <View style={styles.quickRow}>
            <Text style={styles.hint}>{t("balanceLogs.presetsLabel")}</Text>
            <Pressable
              style={styles.presetChip}
              accessibilityRole="button"
              accessibilityLabel={t("balanceLogs.presetFinance")}
              onPress={() => applyPreset("FINANCE_DAILY")}
            >
              <Text style={styles.presetChipText}>{t("balanceLogs.presetFinance")}</Text>
            </Pressable>
            <Pressable
              style={styles.presetChip}
              accessibilityRole="button"
              accessibilityLabel={t("balanceLogs.presetOps")}
              onPress={() => applyPreset("OPS_WEEKLY")}
            >
              <Text style={styles.presetChipText}>{t("balanceLogs.presetOps")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {pickerTarget ? (
        <DateTimePicker
          value={pickerTarget === "start" ? parseDate(startDate) : parseDate(endDate)}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      ) : null}
    </>
  );
}

function buildBalanceFiltersStyles(colors: ThemeColors) {
  return StyleSheet.create({
    filterRow: { gap: 8 },
    dateText: { color: colors.textDark },
    datePlaceholder: { color: colors.textPlaceholder },
    quickRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    hint: { marginTop: 4, color: colors.textSecondary },
    presetChip: {
      borderWidth: 1,
      borderColor: colors.successSoftBorder,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      backgroundColor: colors.successSoft,
    },
    presetChipText: { color: colors.successStrong, fontSize: typography.caption, fontWeight: "800" },
  });
}
