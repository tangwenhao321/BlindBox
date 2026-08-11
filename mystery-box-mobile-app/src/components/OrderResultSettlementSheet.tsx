import { useMemo, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { Product } from "../types";
import { QualityBadge } from "./ui/QualityBadge";
import { RemoteImage } from "./ui/RemoteImage";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { font, radius, spacing, typography } from "../styles/tokens";
import { resolveThemedLustre, type RevealTheme } from "../effects/revealTheme";
import { shouldReduceLustreMotion } from "../effects/revealRemote";
import { lustreTierFromQuality } from "../effects/lustrePalette";
import { LustreCardEdgeShimmer } from "./ui/LustreCardEdgeShimmer";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveProductImageUrl } from "../utils/boxImage";
import { formatOrderIdDisplay } from "../order-utils";
import { filterItemsByQuality, type PrizeQualityFilter } from "../utils/qualityFilters";
import { QualityFilterChips } from "./ui/QualityFilterChips";
import { PayCountdownText } from "./ui/PayCountdownText";
import { usePendingPaymentCountdownLabels } from "../hooks/usePendingPaymentCountdownLabels";
import { needsPityCompensate } from "../utils/pityCompensate";
import { PityCompensateSheet } from "./detail/PityCompensateSheet";

const { width: SCREEN_W } = Dimensions.get("window");

type Props = {
  pendingPayment: boolean;
  orderId: string;
  authToken?: string;
  boxName: string;
  boxId?: string;
  drawCount: number;
  payAmount: number;
  prizes: Product[];
  legendCount: number;
  glow: SharedValue<number>;
  highlightProductId: string | null;
  highlightPulse: SharedValue<number>;
  showPayButton: boolean;
  sharing: boolean;
  onClose: () => void;
  onViewOrders: () => void;
  onPayNow: () => void;
  onTryAgain: () => void;
  onGoWarehouse?: () => void;
  onVerifyFairness?: () => void;
  /** Primary: RevealShareCard highlight capture. */
  onShareHighlight: () => void;
  /** Secondary: opens SharePosterModal with order context. */
  onSharePoster?: () => void;
  revealTheme?: RevealTheme;
  reduceMotion?: boolean;
  /** Pity compensate status from box progress (PENDING / WAIT → show CTA). */
  pityCompensateStatus?: string | null;
  onPityCompleted?: () => void | Promise<void>;
};

export function OrderResultSettlementSheet({
  pendingPayment,
  orderId,
  authToken,
  boxName,
  boxId,
  drawCount,
  payAmount,
  prizes,
  legendCount,
  glow,
  highlightProductId,
  highlightPulse,
  showPayButton,
  sharing,
  onClose,
  onViewOrders,
  onPayNow,
  onTryAgain,
  onGoWarehouse,
  onVerifyFairness,
  onShareHighlight,
  onSharePoster,
  revealTheme,
  reduceMotion = false,
  pityCompensateStatus = null,
  onPityCompleted,
}: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const [filter, setFilter] = useState<PrizeQualityFilter>("ALL");
  const [pitySheetVisible, setPitySheetVisible] = useState(false);
  const countdownLabels = usePendingPaymentCountdownLabels();
  const compensateNeeded =
    !pendingPayment && needsPityCompensate(pityCompensateStatus) && !!authToken && !!boxId;

  const styles = useThemedStyles((colors) => ({
    safeRoot: { flex: 1, backgroundColor: "rgba(10, 8, 7, 0.92)" },
    sheet: {
      flex: 1,
      marginHorizontal: spacing.sm,
      marginVertical: spacing.sm,
      backgroundColor: colors.bgPage,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderSoft,
      overflow: "visible" as const,
    },
    sheetHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    closeIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgSoft,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    closeIcon: { fontSize: 26, lineHeight: 28, color: colors.textMuted, fontWeight: "300" as const },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    title: { ...font("bodySemiBold"), fontSize: typography.h2, color: colors.brandText, flex: 1 },
    metaQuiet: {
      ...font("body"),
      color: colors.textMuted,
      marginBottom: spacing.md,
      fontSize: typography.caption,
      lineHeight: 20,
    },
    pendingBox: {
      backgroundColor: colors.warningSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.warningSoftBorder,
    },
    pendingText: { ...font("body"), color: colors.textSecondary, lineHeight: 22 },
    pendingCountdown: {
      ...font("bodyMedium"),
      marginTop: spacing.xs,
      color: colors.brand,
      fontSize: typography.caption,
    },
    filterRow: { marginBottom: spacing.sm },
    pressed: { opacity: 0.85 },
    statText: { ...font("body"), color: colors.textMuted, marginBottom: spacing.sm, fontSize: typography.caption },
    prizeTitle: { ...font("bodySemiBold"), fontSize: typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
    prizeGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm, paddingHorizontal: 2 },
    prizeItem: { ...font("body"), color: colors.textMuted, paddingVertical: spacing.md },
    actionRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: spacing.sm, marginTop: spacing.xl },
    ghostBtn: {
      flex: 1,
      minWidth: 100,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: "center" as const,
    },
    ghostText: { ...font("bodyMedium"), color: colors.textMuted },
    payBtn: {
      flex: 1,
      minWidth: 100,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.brand,
      alignItems: "center" as const,
    },
    payText: { ...font("bodySemiBold"), color: colors.textOnBrand },
    primaryBtn: {
      flex: 1,
      minWidth: 100,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.brand,
      alignItems: "center" as const,
    },
    primaryText: { ...font("bodySemiBold"), color: colors.brandText },
    shareRow: {
      marginTop: spacing.md,
      gap: spacing.xs,
      alignItems: "center" as const,
    },
    sharePrimaryBtn: {
      alignSelf: "stretch" as const,
      paddingVertical: spacing.md,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.brand,
      alignItems: "center" as const,
      backgroundColor: colors.bgBrandSoft,
    },
    sharePrimaryText: { ...font("bodySemiBold"), color: colors.brandText, fontSize: typography.caption },
    shareSecondaryBtn: {
      paddingVertical: spacing.sm,
      alignItems: "center" as const,
    },
    shareSecondaryText: { ...font("bodyMedium"), color: colors.textMuted, fontSize: typography.caption },
    verifyBtn: { marginTop: spacing.xs, paddingVertical: spacing.sm, alignItems: "center" as const },
    verifyText: { ...font("body"), color: colors.textMuted, fontSize: typography.micro },
    pityBanner: {
      backgroundColor: colors.warningSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.warningSoftBorder,
      gap: spacing.xs,
    },
    pityTitle: { ...font("bodySemiBold"), color: colors.textPrimary, fontSize: typography.caption },
    pityBody: {
      ...font("body"),
      color: colors.textSecondary,
      fontSize: typography.caption,
      lineHeight: 18,
    },
    pityCta: {
      marginTop: spacing.sm,
      alignSelf: "flex-start" as const,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.brand,
      paddingVertical: spacing.xs,
    },
    pityCtaText: { ...font("bodySemiBold"), color: colors.brandText, fontSize: typography.caption },
    prizeTile: {
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
      overflow: "hidden" as const,
    },
    prizeChipHighlight: { borderColor: colors.brand, borderWidth: 1.5 },
    prizeTileImageWrap: { aspectRatio: 1, backgroundColor: colors.bgMuted },
    prizeTileImage: { width: "100%", height: "100%" },
    prizeTileBadge: { position: "absolute" as const, top: 4, left: 4 },
    prizeName: {
      ...font("bodyMedium"),
      padding: spacing.xs,
      fontSize: typography.caption,
      color: colors.textPrimary,
      minHeight: 36,
    },
  }));

  const filteredPrizes = useMemo(() => filterItemsByQuality(prizes, filter), [filter, prizes]);

  const emptyFilterHint = useMemo(() => {
    if (prizes.length === 0) return t("orderResult.emptyNoPrizes");
    if (filter === "LEGENDARY") return t("orderResult.emptyNoLegend");
    if (filter === "ADVANCED") return t("orderResult.emptyNoAdvanced");
    if (filter === "HIDDEN") return t("orderResult.emptyNoHidden");
    if (filter === "GENERAL") return t("orderResult.emptyNoGeneral");
    return t("orderResult.emptyFallback");
  }, [filter, prizes.length, t]);

  useEffect(() => {
    if (pityCompensateStatus?.toUpperCase() === "PENDING" && authToken && boxId && !pendingPayment) {
      setPitySheetVisible(true);
    }
  }, [pityCompensateStatus, authToken, boxId, pendingPayment]);

  return (
    <SafeAreaView style={styles.safeRoot} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.sheet} testID="orderResultCard">
        <View style={styles.sheetHeader}>
          <Text style={styles.title} testID="orderResultTitle">
            {pendingPayment ? t("orderResult.titleCreated") : t("orderResult.titleSuccess")}
          </Text>
          <Pressable
            style={styles.closeIconBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("orderResult.closeA11y")}
            testID="orderResultCloseButton"
          >
            <Text style={styles.closeIcon}>×</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator bounces>
          {pendingPayment ? (
            <>
              <Text style={styles.metaQuiet}>
                {t("orderResult.boxLabel", { name: boxName })}
                {"\n"}
                {t("orderResult.drawCount", { count: drawCount })}
                {" · "}
                {t("orderResult.payAmount", { amount: formatCurrency(payAmount) })}
                {"\n"}
                {t("orderResult.orderId", { id: formatOrderIdDisplay(orderId) })}
              </Text>
              <View style={styles.pendingBox}>
                <Text style={styles.pendingText}>{t("orderResult.pendingHint")}</Text>
                {authToken ? (
                  <PayCountdownText
                    authToken={authToken}
                    orderId={orderId}
                    prefix={countdownLabels.prefix}
                    expiredLabel={countdownLabels.expiredLabel}
                    style={styles.pendingCountdown}
                  />
                ) : null}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.prizeTitle}>{t("orderResult.prizesTitle")}</Text>
              <View style={styles.filterRow}>
                <QualityFilterChips value={filter} onChange={setFilter} />
              </View>
              <Text style={styles.statText}>
                {t("orderResult.statLegend", { legend: legendCount, total: prizes.length })}
                {prizes.length > drawCount
                  ? t("orderResult.statBonus", { bonus: prizes.length - drawCount })
                  : ""}
              </Text>
              <View style={styles.prizeGrid}>
                {filteredPrizes.length === 0 ? (
                  <Text style={styles.prizeItem}>{emptyFilterHint}</Text>
                ) : (
                  filteredPrizes.map((item, index) => (
                    <ResultPrizeTile
                      key={`${item.id}-${index}`}
                      item={item}
                      highlighted={highlightProductId === item.id}
                      highlightPulse={highlightPulse}
                      glow={glow}
                      styles={styles}
                      revealTheme={revealTheme}
                      boxId={boxId}
                      reduceMotion={reduceMotion}
                    />
                  ))
                )}
              </View>
              <Text style={styles.metaQuiet}>
                {t("orderResult.boxLabel", { name: boxName })}
                {" · "}
                {t("orderResult.drawCount", { count: drawCount })}
                {" · "}
                {t("orderResult.payAmount", { amount: formatCurrency(payAmount) })}
                {"\n"}
                {t("orderResult.orderId", { id: formatOrderIdDisplay(orderId) })}
              </Text>
              {compensateNeeded ? (
                <View style={styles.pityBanner} accessibilityRole="summary" testID="orderResultPityCompensate">
                  <Text style={styles.pityTitle}>{t("orderResult.pityCompensateTitle")}</Text>
                  <Text style={styles.pityBody}>{t("orderResult.pityCompensateBody")}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.pityCta, pressed ? styles.pressed : null]}
                    onPress={() => setPitySheetVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t("orderResult.pityCompensateCta")}
                  >
                    <Text style={styles.pityCtaText}>{t("orderResult.pityCompensateCta")}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed ? styles.pressed : null]}
              onPress={onViewOrders}
              accessibilityRole="button"
              accessibilityLabel={t("orderResult.viewOrders")}
              testID="orderResultViewOrdersButton"
            >
              <Text style={styles.ghostText}>{t("orderResult.viewOrders")}</Text>
            </Pressable>
            {showPayButton ? (
              <Pressable
                style={({ pressed }) => [styles.payBtn, pressed ? styles.pressed : null]}
                accessibilityRole="button"
                accessibilityLabel={t("orderResult.payNow")}
                onPress={() => {
                  trackEvent(ANALYTICS_EVENTS.ORDER_RESULT_PAY_NOW_CLICK, { orderId });
                  onPayNow();
                }}
              >
                <Text style={styles.payText}>{t("orderResult.payNow")}</Text>
              </Pressable>
            ) : null}
            {!pendingPayment && onGoWarehouse ? (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
                testID="orderResultGoWarehouseButton"
                accessibilityRole="button"
                accessibilityLabel={t("orderResult.goWarehouseA11y")}
                onPress={() => {
                  trackEvent(ANALYTICS_EVENTS.ORDER_RESULT_GO_WAREHOUSE_CLICK, { orderId });
                  onGoWarehouse();
                }}
              >
                <Text style={styles.primaryText}>{t("orderResult.goWarehouse")}</Text>
              </Pressable>
            ) : null}
            {!pendingPayment ? (
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed ? styles.pressed : null]}
                testID="orderResultTryAgainButton"
                accessibilityRole="button"
                accessibilityLabel={t("orderResult.tryAgain")}
                onPress={() => {
                  trackEvent(ANALYTICS_EVENTS.ORDER_RESULT_TRY_AGAIN_CLICK, { orderId });
                  onTryAgain();
                }}
              >
                <Text style={styles.ghostText}>{t("orderResult.tryAgain")}</Text>
              </Pressable>
            ) : null}
          </View>
          {!pendingPayment ? (
            <View style={styles.shareRow}>
              <Pressable
                style={({ pressed }) => [styles.sharePrimaryBtn, pressed || sharing ? styles.pressed : null]}
                disabled={sharing || !prizes.length}
                testID="orderResultShareHighlightButton"
                accessibilityRole="button"
                accessibilityLabel={t("orderResult.shareHighlight")}
                onPress={() => {
                  trackEvent(ANALYTICS_EVENTS.ORDER_RESULT_SHARE_HIGHLIGHT_CLICK, { orderId });
                  onShareHighlight();
                }}
              >
                {sharing ? (
                  <ActivityIndicator color={themeColors.brand} />
                ) : (
                  <Text style={styles.sharePrimaryText}>{t("orderResult.shareHighlight")}</Text>
                )}
              </Pressable>
              {onSharePoster && prizes.length > 0 ? (
                <Pressable
                  style={({ pressed }) => [styles.shareSecondaryBtn, pressed || sharing ? styles.pressed : null]}
                  disabled={sharing}
                  testID="orderResultSharePosterButton"
                  accessibilityRole="button"
                  accessibilityLabel={t("orderResult.sharePoster")}
                  onPress={() => {
                    trackEvent(ANALYTICS_EVENTS.ORDER_RESULT_SHARE_POSTER_CLICK, { orderId });
                    onSharePoster();
                  }}
                >
                  <Text style={styles.shareSecondaryText}>{t("orderResult.sharePoster")}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {!pendingPayment && prizes.length > 0 && onVerifyFairness ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("orderResult.verifyFairness")}
              style={({ pressed }) => [styles.verifyBtn, pressed ? styles.pressed : null]}
              onPress={() => {
                trackEvent(ANALYTICS_EVENTS.ORDER_RESULT_VERIFY_FAIRNESS_CLICK, { orderId });
                onVerifyFairness();
              }}
            >
              <Text style={styles.verifyText}>{t("orderResult.verifyFairness")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
      {authToken && boxId ? (
        <PityCompensateSheet
          visible={pitySheetVisible && compensateNeeded}
          token={authToken}
          boxId={boxId}
          onClose={() => setPitySheetVisible(false)}
          onCompleted={onPityCompleted}
        />
      ) : null}
    </SafeAreaView>
  );
}

function ResultPrizeTile({
  item,
  highlighted,
  highlightPulse,
  glow,
  styles,
  revealTheme,
  boxId,
  reduceMotion = false,
}: {
  item: Product;
  highlighted: boolean;
  highlightPulse: SharedValue<number>;
  glow: SharedValue<number>;
  styles: ReturnType<typeof useThemedStyles<Record<string, object>>>;
  revealTheme?: RevealTheme;
  boxId?: string;
  reduceMotion?: boolean;
}) {
  const tileStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: highlighted ? highlightPulse.value : interpolate(glow.value, [0, 1], [0.96, 1]),
      },
    ],
  }));
  const imageUri = resolveProductImageUrl(item.id, item.name, item.cover);
  const tileW = (SCREEN_W - spacing.sm * 2 - spacing.lg * 2 - spacing.sm) / 2;
  const lustreTier = lustreTierFromQuality(item.qualityType);
  const lustreMotion = shouldReduceLustreMotion(reduceMotion);
  const lustre = lustreTier ? resolveThemedLustre(lustreTier, revealTheme, boxId) : null;
  const { colors: themeColors } = useAppTheme();

  const inner = (
    <>
      <View style={styles.prizeTileImageWrap}>
        <RemoteImage uri={imageUri} style={styles.prizeTileImage} contentFit="cover" />
        <View style={styles.prizeTileBadge}>
          <QualityBadge tier={item.qualityType} compact />
        </View>
      </View>
      <Text style={styles.prizeName} numberOfLines={2}>
        {item.name}
      </Text>
    </>
  );

  if (lustre && lustreTier) {
    return (
      <Animated.View
        style={[{ width: tileW }, highlighted ? styles.prizeChipHighlight : null, tileStyle]}
        accessibilityLabel={`${item.name} ${item.qualityType ?? ""}`}
      >
        <LustreCardEdgeShimmer
          width={tileW}
          borderRadius={radius.md}
          colors={lustre.rim}
          borderWidth={highlighted ? 2.5 : 2}
          reduceMotion={lustreMotion}
          innerBackground={themeColors.bgSoft}
        >
          {inner}
        </LustreCardEdgeShimmer>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.prizeTile, { width: tileW }, highlighted ? styles.prizeChipHighlight : null, tileStyle]}
      accessibilityLabel={`${item.name} ${item.qualityType ?? ""}`}
    >
      {inner}
    </Animated.View>
  );
}
