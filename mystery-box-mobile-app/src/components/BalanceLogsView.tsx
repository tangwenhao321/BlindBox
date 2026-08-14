import { useEffect, useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { toast } from "../utils/toast";
import { parseError } from "../api";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PageHeader } from "./PageHeader";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { formatCurrency, formatMoney } from "../utils/formatCurrency";
import { layout, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { EmptyState } from "./EmptyState";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { BalanceLogsFiltersSection } from "./balance-logs/BalanceLogsFiltersSection";
import { BalanceLogsStatsSection } from "./balance-logs/BalanceLogsStatsSection";
import { BalanceLogRow } from "./balance-logs/BalanceLogRow";
import type { UserBalanceLog } from "../types";

type Props = {
  logs: UserBalanceLog[];
  loading: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  onBack: () => void;
  onRefresh: () => void;
};

const BALANCE_FILTERS_STORAGE_KEY = "balance_logs_filters_v1";

export function BalanceLogsView(props: Props) {
  const { logs, loading, loadError = null, onRetryLoad, onBack, onRefresh } = props;
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBalanceLogsStyles);
  const [orderKeyword, setOrderKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quickRange, setQuickRange] = useState<"" | "TODAY" | "7D" | "30D">("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [quickMin, setQuickMin] = useState<string>("");
  const [sortMode, setSortMode] = useState<"TIME_DESC" | "AMOUNT_DESC">("TIME_DESC");
  const [lastExportInfo, setLastExportInfo] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const parseDate = (value: string) => {
    if (!value) return new Date();
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };
  const onPickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type !== "set" || !selectedDate || !pickerTarget) {
      setPickerTarget(null);
      return;
    }
    const formatted = formatDate(selectedDate);
    if (pickerTarget === "start") {
      setStartDate(formatted);
    } else {
      setEndDate(formatted);
    }
    setPickerTarget(null);
  };
  const clearFilters = () => {
    setOrderKeyword("");
    setStartDate("");
    setEndDate("");
    setQuickRange("");
    setMinAmount("");
    setMaxAmount("");
    setQuickMin("");
  };
  const applyQuickRange = (range: "" | "TODAY" | "7D" | "30D") => {
    setQuickRange(range);
    if (!range) {
      setStartDate("");
      setEndDate("");
      return;
    }
    const now = new Date();
    const end = formatDate(now);
    const start = new Date(now);
    if (range === "TODAY") {
      // same day
    } else if (range === "7D") {
      start.setDate(now.getDate() - 6);
    } else {
      start.setDate(now.getDate() - 29);
    }
    setStartDate(formatDate(start));
    setEndDate(end);
  };
  const applyPreset = (preset: "FINANCE_DAILY" | "OPS_WEEKLY") => {
    if (preset === "FINANCE_DAILY") {
      applyQuickRange("TODAY");
      setQuickMin("");
      setMinAmount("");
      setMaxAmount("");
      setSortMode("TIME_DESC");
      return;
    }
    applyQuickRange("7D");
    applyQuickMin("10");
    setSortMode("AMOUNT_DESC");
  };
  const resetToDefault = async () => {
    clearFilters();
    setSortMode("TIME_DESC");
    try {
      await AsyncStorage.removeItem(BALANCE_FILTERS_STORAGE_KEY);
      toast.success(t("balanceLogs.resetDefault"));
    } catch {
      toast.info(t("balanceLogs.filtersCleared"));
    }
  };
  useEffect(() => {
    const restoreFilters = async () => {
      try {
        const raw = await AsyncStorage.getItem(BALANCE_FILTERS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          orderKeyword?: string;
          startDate?: string;
          endDate?: string;
          quickRange?: "" | "TODAY" | "7D" | "30D";
          minAmount?: string;
          maxAmount?: string;
          quickMin?: string;
          sortMode?: "TIME_DESC" | "AMOUNT_DESC";
        };
        setOrderKeyword(parsed.orderKeyword ?? "");
        setStartDate(parsed.startDate ?? "");
        setEndDate(parsed.endDate ?? "");
        setQuickRange(parsed.quickRange ?? "");
        setMinAmount(parsed.minAmount ?? "");
        setMaxAmount(parsed.maxAmount ?? "");
        setQuickMin(parsed.quickMin ?? "");
        setSortMode(parsed.sortMode ?? "TIME_DESC");
      } catch {
        // Ignore corrupted local cache.
      }
    };
    restoreFilters();
  }, []);
  useEffect(() => {
    const persistFilters = async () => {
      try {
        await AsyncStorage.setItem(
          BALANCE_FILTERS_STORAGE_KEY,
          JSON.stringify({
            orderKeyword,
            startDate,
            endDate,
            quickRange,
            minAmount,
            maxAmount,
            quickMin,
            sortMode,
          }),
        );
      } catch {
        // Ignore write failures for optional local preferences.
      }
    };
    persistFilters();
  }, [orderKeyword, startDate, endDate, quickRange, minAmount, maxAmount, quickMin, sortMode]);
  const applyQuickMin = (value: string) => {
    setQuickMin(value);
    setMinAmount(value);
    setMaxAmount("");
  };
  const filteredLogs = useMemo(() => {
    const keyword = orderKeyword.trim();
    const startAt = startDate.trim() ? new Date(`${startDate.trim()} 00:00:00`).getTime() : null;
    const endAt = endDate.trim() ? new Date(`${endDate.trim()} 23:59:59`).getTime() : null;
    const min = minAmount.trim() ? Number(minAmount.trim()) : null;
    const max = maxAmount.trim() ? Number(maxAmount.trim()) : null;
    const list = logs.filter((item) => {
      const hitKeyword = !keyword || (item.relatedOrderId || "").includes(keyword);
      const ts = item.createdTime ? new Date(item.createdTime).getTime() : NaN;
      const hitStart = startAt === null || (!Number.isNaN(ts) && ts >= startAt);
      const hitEnd = endAt === null || (!Number.isNaN(ts) && ts <= endAt);
      const amount = Number(item.amount ?? 0);
      const hitMin = min === null || (!Number.isNaN(min) && amount >= min);
      const hitMax = max === null || (!Number.isNaN(max) && amount <= max);
      return hitKeyword && hitStart && hitEnd && hitMin && hitMax;
    });
    list.sort((a, b) => {
      if (sortMode === "AMOUNT_DESC") {
        return Number(b.amount ?? 0) - Number(a.amount ?? 0);
      }
      const ta = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const tb = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [logs, orderKeyword, startDate, endDate, minAmount, maxAmount, sortMode]);
  const stats = useMemo(() => {
    const count = filteredLogs.length;
    const total = filteredLogs.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const avg = count > 0 ? total / count : 0;
    const max = count > 0 ? Math.max(...filteredLogs.map((item) => Number(item.amount ?? 0))) : 0;
    return { total, avg, max };
  }, [filteredLogs]);
  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    const unlimited = t("balanceLogs.unlimited");
    if (orderKeyword.trim()) {
      parts.push(t("balanceLogs.filterOrderKeyword", { keyword: orderKeyword.trim() }));
    }
    if (startDate || endDate) {
      parts.push(t("balanceLogs.filterDate", { start: startDate || unlimited, end: endDate || unlimited }));
    }
    if (minAmount.trim() || maxAmount.trim()) {
      parts.push(t("balanceLogs.filterAmount", { min: minAmount.trim() || unlimited, max: maxAmount.trim() || unlimited }));
    }
    if (quickRange) {
      const label =
        quickRange === "TODAY"
          ? t("balanceLogs.quickToday")
          : quickRange === "7D"
            ? t("balanceLogs.quick7d")
            : t("balanceLogs.quick30d");
      parts.push(t("balanceLogs.filterQuickTime", { label }));
    }
    if (quickMin) {
      parts.push(t("balanceLogs.filterQuickAmount", { amount: quickMin }));
    }
    return parts.length ? parts.join(" | ") : t("balanceLogs.filterAll");
  }, [orderKeyword, startDate, endDate, minAmount, maxAmount, quickRange, quickMin, t]);
  const monthStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    const result = {
      current: { count: 0, total: 0 },
      previous: { count: 0, total: 0 },
    };
    filteredLogs.forEach((item) => {
      if (!item.createdTime) return;
      const date = new Date(item.createdTime);
      if (Number.isNaN(date.getTime())) return;
      const amount = Number(item.amount ?? 0);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        result.current.count += 1;
        result.current.total += amount;
      } else if (date.getFullYear() === prevYear && date.getMonth() === prevMonth) {
        result.previous.count += 1;
        result.previous.total += amount;
      }
    });
    return result;
  }, [filteredLogs]);
  const monthDelta = useMemo(() => {
    const calcPct = (current: number, previous: number) => {
      if (previous === 0) {
        return current === 0 ? 0 : 100;
      }
      return ((current - previous) / previous) * 100;
    };
    const amountPct = calcPct(monthStats.current.total, monthStats.previous.total);
    const countPct = calcPct(monthStats.current.count, monthStats.previous.count);
    return { amountPct, countPct };
  }, [monthStats]);
  const formatDelta = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };
  const shareSummary = async () => {
    const message = [
      t("balanceLogs.shareTitle"),
      filterSummary,
      t("balanceLogs.shareCount", { count: filteredLogs.length }),
      t("balanceLogs.shareTotal", { amount: formatCurrency(stats.total) }),
      t("balanceLogs.shareAvg", { amount: formatCurrency(stats.avg) }),
      t("balanceLogs.shareMax", { amount: formatCurrency(stats.max) }),
      t("balanceLogs.shareMonthCurrent", {
        count: monthStats.current.count,
        amount: formatCurrency(monthStats.current.total),
      }),
      t("balanceLogs.shareMonthPrev", {
        count: monthStats.previous.count,
        amount: formatCurrency(monthStats.previous.total),
      }),
      t("balanceLogs.shareAmountDelta", { delta: formatDelta(monthDelta.amountPct) }),
      t("balanceLogs.shareCountDelta", { delta: formatDelta(monthDelta.countPct) }),
    ].join("\n");
    await Share.share({
      title: t("balanceLogs.shareTitle"),
      message,
    });
  };

  const exportCsv = async () => {
    if (filteredLogs.length === 0) {
      toast.info(t("balanceLogs.exportEmpty"));
      return;
    }
    const header = ["id", "changeType", "amount", "balanceAfter", "relatedOrderId", "createdTime", "remark"];
    const rows = filteredLogs.map((item) =>
      [
        item.id,
        item.changeType,
        formatMoney(Number(item.amount ?? 0)),
        formatMoney(Number(item.balanceAfter ?? 0)),
        item.relatedOrderId ?? "",
        item.createdTime ?? "",
        (item.remark ?? "").replace(/,/g, " "),
      ].join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    try {
      const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!baseDir) {
        throw new Error(t("balanceLogs.exportDirUnavailable"));
      }
      const filename = `balance-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
      const uri = `${baseDir}${filename}`;
      const exportedAt = new Date().toLocaleString(undefined, { hour12: false });
      await FileSystem.writeAsStringAsync(uri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setLastExportInfo(t("balanceLogs.lastExport", { filename, time: exportedAt }));
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        toast.success(t("balanceLogs.exportSaved", { uri }));
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "text/csv",
        dialogTitle: t("balanceLogs.exportDialogTitle"),
      });
    } catch (error) {
      toast.error(parseError(error));
    }
  };

  return (
    <View style={styles.container} accessibilityLabel={t("balanceLogs.a11y")}>
      <OptimizedFlatList
        listVariant="row"
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <BalanceLogRow item={item} />}
        ListHeaderComponent={
          <>
            <PageHeader
              title={t("balanceLogs.title")}
              subtitle={t("balanceLogs.subtitle")}
              onBack={onBack}
              rightActions={
                <Pressable style={styles.headerBtn} onPress={onRefresh} accessibilityRole="button" accessibilityLabel={t("balanceLogs.refreshA11y")}>
                  <Text style={styles.headerBtnText}>{t("balanceLogs.refresh")}</Text>
                </Pressable>
              }
            />
            {loadError ? <ListErrorBanner message={loadError} onRetry={onRetryLoad ?? onRefresh} /> : null}
            <BalanceLogsFiltersSection
              orderKeyword={orderKeyword}
              startDate={startDate}
              endDate={endDate}
              quickRange={quickRange}
              minAmount={minAmount}
              maxAmount={maxAmount}
              quickMin={quickMin}
              pickerTarget={pickerTarget}
              setOrderKeyword={setOrderKeyword}
              setPickerTarget={setPickerTarget}
              setMinAmount={setMinAmount}
              setMaxAmount={setMaxAmount}
              applyQuickRange={applyQuickRange}
              applyQuickMin={applyQuickMin}
              applyPreset={applyPreset}
              setQuickMin={setQuickMin}
              parseDate={parseDate}
              onPickerChange={onPickerChange}
            />
            <BalanceLogsStatsSection
              filteredCount={filteredLogs.length}
              sortMode={sortMode}
              onToggleSort={() => setSortMode((v) => (v === "TIME_DESC" ? "AMOUNT_DESC" : "TIME_DESC"))}
              onClearFilters={clearFilters}
              onResetDefault={resetToDefault}
              onShareSummary={shareSummary}
              onExportCsv={exportCsv}
              total={stats.total}
              avg={stats.avg}
              max={stats.max}
              currentMonthCount={monthStats.current.count}
              currentMonthTotal={monthStats.current.total}
              prevMonthCount={monthStats.previous.count}
              prevMonthTotal={monthStats.previous.total}
              amountPct={monthDelta.amountPct}
              countPct={monthDelta.countPct}
              formatDelta={formatDelta}
              lastExportInfo={lastExportInfo}
              filterSummary={filterSummary}
            />
          </>
        }
        ListEmptyComponent={listEmptyWhenOk(
          loadError,
          shouldShowListSkeleton(loading, logs.length, loadError, loading && logs.length > 0) ? (
            <ListSkeleton variant="row" rows={5} />
          ) : (
            <EmptyState
              title={t("balanceLogs.emptyTitle")}
              description={t("balanceLogs.emptyDesc")}
            />
          ),
        )}
      />
    </View>
  );
}

function buildBalanceLogsStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  listContent: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: layout.screenPaddingBottom,
    gap: spacing.sm,
  },
  headerBtn: {
    borderWidth: 1.5,
    borderColor: colors.infoSoftBorder,
    backgroundColor: colors.infoSoft,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  headerBtnText: { color: colors.link, fontWeight: "700", fontSize: typography.caption },
  });
}
