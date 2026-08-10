import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
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
import { radius, spacing, typography } from "../styles/tokens";
import { resolveThemedLustre, type RevealTheme } from "../effects/revealTheme";
import { shouldReduceLustreMotion } from "../effects/revealRemote";
import { lustreTierFromQuality } from "../effects/lustrePalette";
import { LustreCardEdgeShimmer } from "./ui/LustreCardEdgeShimmer";
import { trackEvent } from "../utils/analytics";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveProductImageUrl } from "../utils/boxImage";
import { formatOrderIdDisplay } from "../order-utils";
import { filterItemsByQuality, type PrizeQualityFilter } from "../utils/qualityFilters";
import { QualityFilterChips } from "./ui/QualityFilterChips";
import { PayCountdownText } from "./ui/PayCountdownText";
import { usePendingPaymentCountdownLabels } from "../hooks/usePendingPaymentCountdownLabels";

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
  onVerifyFairness?: () => void;
  onShareReveal: () => void;
  revealTheme?: RevealTheme;
  reduceMotion?: boolean;
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
  onVerifyFairness,
  onShareReveal,
  revealTheme,
  reduceMotion = false,
}: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const [filter, setFilter] = useState<PrizeQualityFilter>("ALL");
  const countdownLabels = usePendingPaymentCountdownLabels();

  const styles = useThemedStyles((colors) => ({
    safeRoot: { flex: 1, backgroundColor: colors.overlay },
    sheet: {
      flex: 1,
      marginHorizontal: spacing.md,
      marginVertical: spacing.sm,
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.violetPanelBorder,
      overflow: "visible",
      shadowColor: colors.shadowInk,
      shadowOpacity: 0.14,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.bgSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    closeIcon: { fontSize: 26, lineHeight: 28, color: colors.textSecondary, fontWeight: "300" },
    scroll: { flex: 1 },
    scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    title: { fontSize: typography.h3, fontWeight: "800", color: colors.brandText, flex: 1 },
    text: { color: colors.textPrimary, marginBottom: spacing.xs, fontWeight: "600", fontSize: typography.bodyLg },
    meta: { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.md, fontSize: typography.caption },
    pendingBox: {
      backgroundColor: colors.warningSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    pendingText: { color: colors.textSecondary, lineHeight: 22 },
    pendingCountdown: { marginTop: spacing.xs, color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    filterRow: { marginBottom: spacing.sm },
    filterTab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
    },
    filterTabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    filterText: { fontWeight: "700", color: colors.textSecondary, fontSize: typography.caption },
    filterTextActive: { color: colors.textOnBrand },
    pressed: { opacity: 0.85 },
    statText: { color: colors.textMuted, marginBottom: spacing.sm, fontSize: typography.caption },
    prizeTitle: { fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.sm },
    prizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: 2 },
    prizeItem: { color: colors.textMuted, paddingVertical: spacing.md },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
    ghostBtn: {
      flex: 1,
      minWidth: 100,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    ghostText: { fontWeight: "700", color: colors.textSecondary },
    payBtn: {
      flex: 1,
      minWidth: 100,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      alignItems: "center",
    },
    payText: { fontWeight: "800", color: colors.textOnBrand },
    primaryBtn: {
      flex: 1,
      minWidth: 100,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.teal,
      alignItems: "center",
    },
    primaryText: { fontWeight: "800", color: colors.textOnBrand },
    shareBtn: {
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.brand,
      alignItems: "center",
    },
    shareText: { fontWeight: "800", color: colors.brand },
    verifyBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm, alignItems: "center" },
    verifyText: { color: colors.brand, fontWeight: "700" },
    prizeTile: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
      overflow: "hidden",
    },
    prizeChipHighlight: { borderColor: colors.brand, borderWidth: 2 },
    prizeTileImageWrap: { aspectRatio: 1, backgroundColor: colors.bgMuted },
    prizeTileImage: { width: "100%", height: "100%" },
    prizeTileBadge: { position: "absolute", top: 4, left: 4 },
    prizeName: {
      padding: spacing.xs,
      fontSize: typography.caption,
      fontWeight: "700",
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
          <Text style={styles.text}>{t("orderResult.boxLabel", { name: boxName })}</Text>
          <Text style={styles.text}>{t("orderResult.drawCount", { count: drawCount })}</Text>
          <Text style={styles.text}>{t("orderResult.payAmount", { amount: formatCurrency(payAmount) })}</Text>
          <Text style={styles.meta} accessibilityLabel={t("orderResult.orderId", { id: orderId })}>
            {t("orderResult.orderId", { id: formatOrderIdDisplay(orderId) })}
          </Text>

          {pendingPayment ? (
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
          ) : (
            <>
              <View style={styles.filterRow}>
                <QualityFilterChips value={filter} onChange={setFilter} />
              </View>
              <Text style={styles.statText}>
                {t("orderResult.statLegend", { legend: legendCount, total: prizes.length })}
                {prizes.length > drawCount
                  ? t("orderResult.statBonus", { bonus: prizes.length - drawCount })
                  : ""}
              </Text>
              <Text style={styles.prizeTitle}>{t("orderResult.prizesTitle")}</Text>
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
                  trackEvent("order_result_pay_now_click", { orderId });
                  onPayNow();
                }}
              >
                <Text style={styles.payText}>{t("orderResult.payNow")}</Text>
              </Pressable>
            ) : null}
            {!pendingPayment ? (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed ? styles.pressed : null]}
                testID="orderResultTryAgainButton"
                accessibilityRole="button"
                accessibilityLabel={t("orderResult.tryAgain")}
                onPress={() => {
                  trackEvent("order_result_try_again_click", { orderId });
                  onTryAgain();
                }}
              >
                <Text style={styles.primaryText}>{t("orderResult.tryAgain")}</Text>
              </Pressable>
            ) : null}
          </View>
          {!pendingPayment ? (
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed || sharing ? styles.pressed : null]}
              disabled={sharing || !prizes.length}
              testID="orderResultShareRevealButton"
              accessibilityRole="button"
              accessibilityLabel={t("orderResult.shareReveal")}
              onPress={() => {
                trackEvent("order_result_share_click", { orderId });
                onShareReveal();
              }}
            >
              {sharing ? (
                <ActivityIndicator color={themeColors.brand} />
              ) : (
                <Text style={styles.shareText}>{t("orderResult.shareReveal")}</Text>
              )}
            </Pressable>
          ) : null}
          {!pendingPayment && prizes.length > 0 && onVerifyFairness ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("orderResult.verifyFairness")}
              style={({ pressed }) => [styles.verifyBtn, pressed ? styles.pressed : null]}
              onPress={() => {
                trackEvent("order_result_verify_fairness_click", { orderId });
                onVerifyFairness();
              }}
            >
              <Text style={styles.verifyText}>{t("orderResult.verifyFairness")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
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
  const tileW = (SCREEN_W - spacing.md * 2 - spacing.lg * 2 - spacing.sm) / 2;
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
