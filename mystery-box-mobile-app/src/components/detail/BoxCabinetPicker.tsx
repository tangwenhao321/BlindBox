import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { usePayCountdown } from "../../hooks/usePayCountdown";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { fetchPoolSlots, reservePoolSlot, releasePoolSlotReserve, type PoolSlot } from "../../services/poolSlotService";
import { fetchHintSession } from "../../services/hintService";
import { parseError } from "../../api";
import { trackEvent } from "../../utils/analytics";
import { QualityBadge } from "../ui/QualityBadge";

const RESERVE_TOTAL_SEC = 60;
const POLL_MS = 8000;

type Props = {
  token: string;
  boxId: string;
  selectedSlotNo: number | null;
  onSelectSlot: (slotNo: number | null) => void;
  excludedQualityTypes?: string[];
  onExcludedQualityTypesChange?: (types: string[]) => void;
  onOpenShake?: () => void;
};

export function BoxCabinetPicker({
  token,
  boxId,
  selectedSlotNo,
  onSelectSlot,
  excludedQualityTypes: excludedProp,
  onExcludedQualityTypesChange,
  onOpenShake,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildCabinetStyles);
  const [slots, setSlots] = useState<PoolSlot[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExcluded, setSessionExcluded] = useState<string[]>([]);
  const refreshInFlight = useRef(false);

  const excludedQualityTypes = excludedProp ?? sessionExcluded;

  const selectedSlot = slots.find((slot) => slot.slotNo === selectedSlotNo) ?? null;
  const reserveDeadline = selectedSlot?.reservedUntil ?? null;
  const { remainingSec } = usePayCountdown(reserveDeadline);
  const reserveProgress =
    reserveDeadline && selectedSlotNo != null
      ? Math.min(1, Math.max(0, remainingSec / RESERVE_TOTAL_SEC))
      : 0;

  const refresh = useCallback(
    async (opts?: { showLoading?: boolean }) => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      const showLoading = opts?.showLoading ?? slots.length === 0;
      if (showLoading) setInitialLoading(true);
      try {
        const grid = await fetchPoolSlots(token, boxId);
        setSlots(grid.slots ?? []);
        setError(null);
        const session = await fetchHintSession(token, boxId);
        const excluded = session.excludedQualityTypes ?? [];
        setSessionExcluded(excluded);
        onExcludedQualityTypesChange?.(excluded);
      } catch (e) {
        if (slots.length === 0) setSlots([]);
        setError(parseError(e));
      } finally {
        refreshInFlight.current = false;
        if (showLoading) setInitialLoading(false);
      }
    },
    [boxId, onExcludedQualityTypesChange, slots.length, token],
  );

  useEffect(() => {
    void refresh({ showLoading: true });
    const timer = setInterval(() => void refresh({ showLoading: false }), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    return () => {
      void releasePoolSlotReserve(token, boxId).catch(() => undefined);
    };
  }, [boxId, token]);

  const handlePress = async (slot: PoolSlot) => {
    if (slot.status === "SOLD") return;
    if (selectedSlotNo === slot.slotNo) {
      await releasePoolSlotReserve(token, boxId).catch(() => undefined);
      trackEvent("cabinet_release", { boxId, slotNo: slot.slotNo });
      onSelectSlot(null);
      void refresh({ showLoading: false });
      return;
    }
    try {
      await reservePoolSlot(token, boxId, slot.slotNo);
      trackEvent("cabinet_reserve", { boxId, slotNo: slot.slotNo });
      onSelectSlot(slot.slotNo);
      void refresh({ showLoading: false });
    } catch (e) {
      setError(parseError(e));
      void refresh({ showLoading: false });
    }
  };

  if (initialLoading && slots.length === 0) {
    return <Text style={styles.hint}>{t("boxDetails.cabinet.loading")}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t("boxDetails.cabinet.title")}</Text>
        {onOpenShake ? (
          <Pressable
            onPress={onOpenShake}
            accessibilityRole="button"
            accessibilityLabel={t("cabinet.shakeOpenA11y")}
            style={styles.shakeLink}
          >
            <Text style={styles.shakeLinkText}>{t("cabinet.shakeOpen")}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>{t("boxDetails.cabinet.hint")}</Text>
      {selectedSlotNo != null && reserveDeadline ? (
        <View style={styles.countdownWrap} accessibilityRole="timer">
          <View style={styles.countdownHead}>
            <Text style={styles.countdownLabel}>
              {t("cabinet.reserveCountdown", { seconds: remainingSec })}
            </Text>
          </View>
          <View style={styles.countdownTrack}>
            <View style={[styles.countdownFill, { width: `${Math.round(reserveProgress * 100)}%` }]} />
          </View>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.grid}>
        {(slots ?? []).map((slot) => {
          const selected = selectedSlotNo === slot.slotNo;
          const sold = slot.status === "SOLD";
          const reserved = slot.status === "RESERVED" && !selected;
          return (
            <Pressable
              key={slot.slotNo}
              accessibilityRole="button"
              accessibilityLabel={t("boxDetails.cabinet.slotA11y", {
                no: slot.slotNo,
                status: sold
                  ? t("boxDetails.cabinet.statusSold")
                  : reserved
                    ? t("boxDetails.cabinet.statusReserved")
                    : t("boxDetails.cabinet.statusAvailable"),
              })}
              accessibilityState={{ selected, disabled: sold || reserved }}
              accessibilityHint={
                sold
                  ? t("boxDetails.cabinet.slotHintSold")
                  : reserved
                    ? t("boxDetails.cabinet.slotHintReserved")
                    : undefined
              }
              disabled={sold || reserved}
              onPress={() => void handlePress(slot)}
              style={[
                styles.cell,
                sold ? styles.cellSold : null,
                reserved ? styles.cellReserved : null,
                selected ? styles.cellSelected : null,
              ]}
            >
              <Text style={styles.cellNo}>{slot.slotNo}</Text>
              {excludedQualityTypes.length > 0 && !sold ? (
                <View style={styles.cellBadges}>
                  {excludedQualityTypes.slice(0, 2).map((quality) => (
                    <QualityBadge key={quality} tier={quality} compact />
                  ))}
                  {excludedQualityTypes.length > 2 ? (
                    <Text style={styles.moreBadge}>+{excludedQualityTypes.length - 2}</Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildCabinetStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md, gap: spacing.xs },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontWeight: "900", fontSize: typography.body, color: colors.textPrimary },
    shakeLink: { paddingVertical: 2, paddingHorizontal: spacing.xs },
    shakeLinkText: { fontSize: typography.micro, fontWeight: "800", color: colors.brand },
    hint: { fontSize: typography.micro, color: colors.textMuted },
    countdownWrap: { gap: 4, marginTop: spacing.xs },
    countdownHead: { flexDirection: "row", justifyContent: "space-between" },
    countdownLabel: { fontSize: typography.micro, fontWeight: "700", color: colors.warning },
    countdownTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    countdownFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: colors.warning,
    },
    error: { fontSize: typography.micro, color: colors.danger },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
    cell: {
      width: 72,
      minHeight: 72,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.xs,
      gap: 2,
    },
    cellSold: { backgroundColor: colors.bgMuted, opacity: 0.5 },
    cellReserved: { borderColor: colors.warning, backgroundColor: colors.warningSoft },
    cellSelected: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
    cellNo: { fontWeight: "800", color: colors.textPrimary },
    cellBadges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2, marginTop: 2 },
    moreBadge: { fontSize: 9, fontWeight: "800", color: colors.textMuted },
  });
}
