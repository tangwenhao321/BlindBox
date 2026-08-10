import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { DrawQueuePanel } from "./DrawQueuePanel";
import { DrawQueueRoomSheet } from "./DrawQueueRoomSheet";
import { BoxCabinetPicker } from "./BoxCabinetPicker";
import { CabinetShakeSheet } from "./CabinetShakeSheet";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { QueueStatus } from "../../services/drawQueueService";
import type { DrawMode } from "../../services/orderService";

const INSTANT_MODE: DrawMode = "instant";
const ADVANCED_MODES: { key: DrawMode; labelKey: string }[] = [
  { key: "queue", labelKey: "boxDetails.modeQueue" },
  { key: "cabinet", labelKey: "boxDetails.modeCabinet" },
  { key: "buyout", labelKey: "boxDetails.modeBuyout" },
];

const MODE_HINT_KEYS: Record<DrawMode, string> = {
  instant: "boxDetails.modeHintInstant",
  queue: "boxDetails.modeHintQueue",
  cabinet: "boxDetails.modeHintCabinet",
  buyout: "boxDetails.modeHintBuyout",
};

type Props = {
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  queueBlocked: boolean;
  buyoutBlocked: boolean;
  buyoutLockHeld: boolean;
  buyoutLockTtl: number;
  queueStatus: QueueStatus | null;
  poolRemaining: number;
  authToken?: string;
  boxId?: string;
  selectedSlotNo?: number | null;
  onSelectSlot?: (slotNo: number | null) => void;
  cabinetBlocked?: boolean;
};

export function BoxDetailsModeSection(props: Props) {
  const { t } = useTranslation();
  const {
    drawMode,
    onDrawModeChange,
    queueBlocked,
    buyoutBlocked,
    buyoutLockHeld,
    buyoutLockTtl,
    queueStatus,
    poolRemaining,
    authToken,
    boxId,
    selectedSlotNo = null,
    onSelectSlot,
    cabinetBlocked,
  } = props;

  const [queueRoomVisible, setQueueRoomVisible] = useState(false);
  const [shakeVisible, setShakeVisible] = useState(false);
  const [excludedQualityTypes, setExcludedQualityTypes] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(drawMode !== INSTANT_MODE);

  const styles = useThemedStyles((colors) => ({
    modeBanner: {
      marginBottom: spacing.sm,
      padding: spacing.sm,
      borderRadius: 8,
      backgroundColor: "rgba(255, 152, 0, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(255, 152, 0, 0.35)",
    },
    modeBannerWarn: {
      backgroundColor: "rgba(244, 67, 54, 0.1)",
      borderColor: "rgba(244, 67, 54, 0.35)",
    },
    modeBannerOk: {
      backgroundColor: "rgba(76, 175, 80, 0.1)",
      borderColor: "rgba(76, 175, 80, 0.35)",
    },
    modeBannerText: { fontSize: typography.caption, color: colors.textPrimary, fontWeight: "600" },
    modeBannerAction: { marginTop: spacing.xs, color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    modeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
    modeChip: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      backgroundColor: colors.bgCard,
    },
    modeChipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    modeText: { fontSize: typography.micro, fontWeight: "700", color: colors.textSecondary },
    modeTextOn: { color: colors.textOnBrand },
    modeHint: {
      fontSize: typography.micro,
      color: colors.textMuted,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
    advancedToggle: { alignSelf: "center", marginBottom: spacing.sm, paddingVertical: spacing.xs },
    advancedToggleText: { color: colors.link, fontWeight: "700", fontSize: typography.caption },
  }));

  const showAdvancedModes = advancedOpen || drawMode !== INSTANT_MODE;

  return (
    <View>
      {queueBlocked ? (
        <View style={styles.modeBanner}>
          <Text style={styles.modeBannerText}>
            {t("boxDetails.queueBlockedBanner", { position: queueStatus?.position ?? "?" })}
          </Text>
        </View>
      ) : buyoutBlocked ? (
        <View style={[styles.modeBanner, styles.modeBannerWarn]}>
          <Text style={styles.modeBannerText}>{t("boxDetails.buyoutBlockedBanner")}</Text>
          <Pressable
            onPress={() => onDrawModeChange(INSTANT_MODE)}
            accessibilityRole="button"
            accessibilityLabel={t("boxDetails.switchToInstantA11y")}
          >
            <Text style={styles.modeBannerAction}>{t("boxDetails.switchToInstant")}</Text>
          </Pressable>
        </View>
      ) : cabinetBlocked ? (
        <View style={styles.modeBanner}>
          <Text style={styles.modeBannerText}>{t("boxDetails.cabinetBlockedBanner")}</Text>
        </View>
      ) : drawMode === "buyout" && buyoutLockHeld ? (
        <View style={[styles.modeBanner, styles.modeBannerOk]}>
          <Text style={styles.modeBannerText}>
            {buyoutLockTtl
              ? t("boxDetails.buyoutActiveBanner", { seconds: buyoutLockTtl })
              : t("boxDetails.buyoutActiveBannerNoTtl")}
          </Text>
        </View>
      ) : null}

      <View style={styles.modeRow}>
        <Pressable
          testID="drawMode-instant"
          style={[styles.modeChip, drawMode === INSTANT_MODE ? styles.modeChipOn : null, { flex: showAdvancedModes ? 1 : 2 }]}
          onPress={() => onDrawModeChange(INSTANT_MODE)}
          accessibilityRole="button"
          accessibilityState={{ selected: drawMode === INSTANT_MODE }}
          accessibilityLabel={t("boxDetails.modeInstant")}
        >
          <Text style={[styles.modeText, drawMode === INSTANT_MODE ? styles.modeTextOn : null]}>
            {t("boxDetails.modeInstant")}
          </Text>
        </Pressable>
        {showAdvancedModes
          ? ADVANCED_MODES.map((mode) => (
              <Pressable
                key={mode.key}
                testID={`drawMode-${mode.key}`}
                style={[styles.modeChip, drawMode === mode.key ? styles.modeChipOn : null]}
                onPress={() => onDrawModeChange(mode.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: drawMode === mode.key }}
                accessibilityLabel={t(mode.labelKey)}
              >
                <Text style={[styles.modeText, drawMode === mode.key ? styles.modeTextOn : null]}>
                  {t(mode.labelKey)}
                </Text>
              </Pressable>
            ))
          : null}
      </View>

      {!showAdvancedModes ? (
        <Pressable
          style={styles.advancedToggle}
          onPress={() => setAdvancedOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t("boxDetails.advancedModesExpandA11y")}
        >
          <Text style={styles.advancedToggleText}>{t("boxDetails.advancedModesExpand")}</Text>
        </Pressable>
      ) : drawMode === INSTANT_MODE ? (
        <Pressable
          style={styles.advancedToggle}
          onPress={() => setAdvancedOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={t("boxDetails.advancedModesCollapseA11y")}
        >
          <Text style={styles.advancedToggleText}>{t("boxDetails.advancedModesCollapse")}</Text>
        </Pressable>
      ) : null}

      {!queueBlocked && !buyoutBlocked && !cabinetBlocked ? (
        <Text style={styles.modeHint}>{t(MODE_HINT_KEYS[drawMode])}</Text>
      ) : null}

      {drawMode === "cabinet" && authToken && boxId && onSelectSlot ? (
        <BoxCabinetPicker
          token={authToken}
          boxId={boxId}
          selectedSlotNo={selectedSlotNo}
          onSelectSlot={onSelectSlot}
          excludedQualityTypes={excludedQualityTypes}
          onExcludedQualityTypesChange={setExcludedQualityTypes}
          onOpenShake={() => setShakeVisible(true)}
        />
      ) : null}

      <DrawQueuePanel
        mode={drawMode}
        authToken={authToken}
        queueStatus={queueStatus}
        buyoutLockTtl={buyoutLockTtl || queueStatus?.lockTtlSeconds || 0}
        buyoutLockHeld={buyoutLockHeld}
        poolRemaining={poolRemaining}
        onOpenQueueRoom={drawMode === "queue" ? () => setQueueRoomVisible(true) : undefined}
      />

      <DrawQueueRoomSheet
        visible={queueRoomVisible}
        authToken={authToken}
        boxId={boxId}
        queueStatus={queueStatus}
        onClose={() => setQueueRoomVisible(false)}
      />

      {authToken && boxId ? (
        <CabinetShakeSheet
          visible={shakeVisible}
          token={authToken}
          boxId={boxId}
          onClose={() => setShakeVisible(false)}
          onHintResult={(result) => setExcludedQualityTypes(result.excludedQualityTypes ?? [])}
        />
      ) : null}
    </View>
  );
}
