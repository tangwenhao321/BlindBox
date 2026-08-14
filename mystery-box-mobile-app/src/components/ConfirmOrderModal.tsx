import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { PayCountdownText } from "./ui/PayCountdownText";
import { resolvePaymentMode , getPaymentMethodHint } from "../config/payment";
import { measureAnchor, useOnboardingAnchors } from "../context/OnboardingAnchorContext";
import { AgreementCheckbox } from "./ui/AgreementCheckbox";
import { PaymentMethodBadge } from "./ui/PaymentMethodBadge";
import { InlineSectionError } from "./ui/InlineSectionError";
import { RemoteImage } from "./ui/RemoteImage";
import { FairnessTrustRow } from "./FairnessTrustRow";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { useLoopPulse } from "../effects/reanimated/useLoopPulse";
import { font, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { resolveBoxImageUrl } from "../utils/boxImage";
import { formatCurrency, formatCurrencyDiscount } from "../utils/formatCurrency";
import { openContactSupport } from "../utils/contactSupport";
import { resolveLegalLink } from "../utils/legalLinks";
import { usePendingPaymentCountdownLabels } from "../hooks/usePendingPaymentCountdownLabels";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import type { MysteryBox } from "../types";

function QuoteSkeletonRow({ label, colors }: { label: string; colors: ThemeColors }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.7;
      return;
    }
    opacity.value = withRepeat(withTiming(0.95, { duration: 850 }), -1, true);
  }, [opacity, reduceMotion]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={quoteSkeletonStyles.row} accessibilityRole="progressbar" accessibilityLabel={label}>
      <Animated.View
        style={[
          quoteSkeletonStyles.bar,
          { backgroundColor: colors.bgMuted },
          shimmerStyle,
        ]}
      />
      <Text style={[quoteSkeletonStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const quoteSkeletonStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  bar: { width: 72, height: 12, borderRadius: radius.pill },
  label: { ...font("body"), fontSize: typography.caption, flex: 1 },
});

type Props = {
  visible: boolean;
  box: MysteryBox;
  drawCount: number;
  unitPrice: number;
  productAmount: number;
  batchDiscount: number;
  deliveryFee: number;
  couponAmount: number;
  retentionDiscountAmount?: number;
  payAmount: number;
  quoting?: boolean;
  quoteError?: string | null;
  onRetryQuote?: () => void;
  paying?: boolean;
  agreed: boolean;
  payBlocked?: boolean;
  payBlockedHint?: string;
  payDeadlineLabel?: string;
  payDeadlineIso?: string;
  hasAddress?: boolean;
  addressSummary?: string | null;
  onEditAddress?: () => void;
  /** Same path as AddressRequiredBanner — open address form / manage. */
  onRequestAddress?: () => void;
  onToggleAgreed: () => void;
  onClose: () => void;
  onPay: (wallet?: "default" | "momo") => void;
  deferPayLabel?: string;
  onDeferPay?: () => void;
  suggestedCouponSavings?: number;
  suggestedCouponApplied?: boolean;
  suggestedCouponUserId?: string;
  availableCoupons?: import("../types").CouponItem[];
  selectedCouponUserId?: string;
  onSelectCoupon?: (couponUserId: string) => void;
  spendLimitWarning?: string | null;
  spendLimitBlocked?: boolean;
  /** Open-box checkout: hide address and freight (only shown when applying to ship). */
  hideShippingDetails?: boolean;
  /** Public probability rates (base 10000) for checkout disclosure. */
  probabilityRates?: {
    legendaryRate: number;
    hiddenRate: number;
    generalRate: number;
    dynamicProbability?: boolean;
    adjusted?: boolean;
  } | null;
};

const TERMS_KEYS = [
  "checkout.terms1",
  "checkout.terms2",
  "checkout.terms3",
  "checkout.terms4",
  "checkout.terms5",
] as const;

const MOMO_ENV_ENABLED = process.env.EXPO_PUBLIC_MOMO_ENABLED === "true";

const LEGAL_LINKS = [
  { key: "checkout.legalPrivacy", url: process.env.EXPO_PUBLIC_PRIVACY_URL, view: "privacy" as const },
  { key: "checkout.legalTerms", url: process.env.EXPO_PUBLIC_TERMS_URL, view: "termsOfService" as const },
  { key: "checkout.legalMinor", url: process.env.EXPO_PUBLIC_MINOR_DECLARATION_URL, view: "minorDeclaration" as const },
] as const;

function openLegalLink(url: string | undefined, view: "privacy" | "termsOfService" | "minorDeclaration") {
  const target = resolveLegalLink(url, view);
  if (target.kind === "external") {
    void Linking.openURL(target.url);
    return;
  }
  router.push(target.href as never);
}

/** Theme ink/page hex → rgba for image fades (LinearGradient needs rgba strings). */
function themeInkAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length < 6) return `rgba(20,17,15,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function ConfirmOrderModal({
  visible,
  box,
  drawCount,
  unitPrice,
  productAmount,
  batchDiscount,
  deliveryFee,
  couponAmount,
  retentionDiscountAmount = 0,
  payAmount,
  quoting,
  quoteError,
  onRetryQuote,
  paying,
  agreed,
  payBlocked,
  payBlockedHint,
  payDeadlineLabel,
  payDeadlineIso,
  hasAddress,
  addressSummary,
  onEditAddress,
  onRequestAddress,
  onToggleAgreed,
  onClose,
  onPay,
  deferPayLabel,
  onDeferPay,
  suggestedCouponSavings = 0,
  suggestedCouponApplied,
  suggestedCouponUserId,
  availableCoupons = [],
  selectedCouponUserId = "",
  onSelectCoupon,
  spendLimitWarning,
  spendLimitBlocked = false,
  hideShippingDetails = false,
  probabilityRates = null,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildConfirmOrderStyles);
  const reduceMotion = useReduceMotion();
  const { momoEnabled: momoServerEnabled } = useAppPublicConfig();
  // Only offer MoMo when both env and server advertise live checkout (stub never advertises)
  const momoEnabled = MOMO_ENV_ENABLED && momoServerEnabled === true;
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"default" | "momo">("default");
  const payAreaRef = useRef<View>(null);
  const { setAnchor } = useOnboardingAnchors();
  const countdownLabels = usePendingPaymentCountdownLabels();
  const sheetOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const sheetTranslateY = useSharedValue(reduceMotion ? 0 : 28);
  const oddsMissing = !probabilityRates;
  const payDisabled = !agreed || oddsMissing || Boolean(quoting) || Boolean(paying) || Boolean(payBlocked) || Boolean(quoteError) || spendLimitBlocked;
  const ctaPulse = useLoopPulse(visible && !payDisabled && !reduceMotion, 900);
  const ctaPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ctaPulse.value, [0, 1], [0.985, 1]) }],
  }));
  const sheetEnterStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  useEffect(() => {
    if (!momoEnabled && paymentMethod === "momo") {
      setPaymentMethod("default");
    }
  }, [momoEnabled, paymentMethod]);

  useEffect(() => {
    if (!visible) {
      sheetOpacity.value = reduceMotion ? 1 : 0;
      sheetTranslateY.value = reduceMotion ? 0 : 28;
      return;
    }
    if (reduceMotion) {
      sheetOpacity.value = 1;
      sheetTranslateY.value = 0;
      return;
    }
    sheetOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    sheetTranslateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [visible, reduceMotion, sheetOpacity, sheetTranslateY]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => measureAnchor(payAreaRef, "payArea", setAnchor), 300);
    return () => clearTimeout(timer);
  }, [visible, setAnchor]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} testID="confirmOrderModal">
      <View style={styles.mask}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("checkout.close")}
        />
        <Animated.View style={[styles.sheet, sheetEnterStyle]}>
          <View style={styles.head}>
            <Text style={styles.title}>{t("checkout.title")}</Text>
            {payDeadlineIso ? (
              <PayCountdownText
                deadlineIso={payDeadlineIso}
                prefix={countdownLabels.prefix}
                expiredLabel={countdownLabels.expiredLabel}
                style={styles.deadline}
              />
            ) : payDeadlineLabel ? (
              <Text style={styles.deadline}>{payDeadlineLabel}</Text>
            ) : null}
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("checkout.close")}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.spotlight}>
              <RemoteImage uri={resolveBoxImageUrl(box)} style={styles.spotlightImage} />
              <LinearGradient
                colors={["transparent", themeInkAlpha(colors.bgPage, 0.85)]}
                style={styles.spotlightFade}
                pointerEvents="none"
              />
              <View style={styles.spotlightMeta}>
                <Text style={styles.productName} numberOfLines={2}>
                  {box.name}
                </Text>
                <View style={styles.productPriceRow}>
                  <Text style={styles.unitPrice}>{formatCurrency(unitPrice)}</Text>
                  <Text style={styles.qtyBadge}>×{drawCount}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.line}>
                <Text style={styles.lineLabel}>{t("checkout.productAmount")}</Text>
                <Text style={styles.lineValue}>
                  {quoting ? "—" : formatCurrency(productAmount)}
                </Text>
              </View>
              {batchDiscount > 0.009 ? (
                <View style={styles.line}>
                  <View style={styles.discountLabelWrap}>
                    <Text style={styles.lineLabel}>{t("checkout.batchDiscount")}</Text>
                    <View style={styles.discountTag}>
                      <Text style={styles.discountTagText}>{t("checkout.batchDiscountTag")}</Text>
                    </View>
                  </View>
                  <Text style={styles.discountValue}>{formatCurrencyDiscount(batchDiscount)}</Text>
                </View>
              ) : null}
              {couponAmount > 0.009 ? (
                <View style={styles.line}>
                  <Text style={styles.lineLabel}>{t("checkout.coupon")}</Text>
                  <Text style={styles.discountValue}>{formatCurrencyDiscount(couponAmount)}</Text>
                </View>
              ) : null}
              {availableCoupons.length > 0 && onSelectCoupon ? (
                <View style={styles.couponPicker} accessibilityRole="summary">
                  <Text style={styles.couponPickerLabel}>{t("checkout.couponPicker")}</Text>
                  <View style={styles.couponChipRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.couponChip,
                        !selectedCouponUserId ? styles.couponChipActive : null,
                        pressed ? styles.couponChipPressed : null,
                      ]}
                      onPress={() => onSelectCoupon("")}
                      accessibilityRole="button"
                      accessibilityState={{ selected: !selectedCouponUserId }}
                      accessibilityLabel={t("checkout.couponNone")}
                    >
                      <Text
                        style={[
                          styles.couponChipText,
                          !selectedCouponUserId ? styles.couponChipTextActive : null,
                        ]}
                      >
                        {t("checkout.couponNone")}
                      </Text>
                    </Pressable>
                    {availableCoupons.map((c) => {
                      const amount = Number(c.amount ?? c.coupon?.amount ?? 0);
                      const selected = selectedCouponUserId === c.id;
                      const label =
                        c.name?.trim() ||
                        c.coupon?.name?.trim() ||
                        t("checkout.couponChip", { amount: formatCurrency(amount) });
                      return (
                        <Pressable
                          key={c.id}
                          style={({ pressed }) => [
                            styles.couponChip,
                            selected ? styles.couponChipActive : null,
                            pressed ? styles.couponChipPressed : null,
                          ]}
                          onPress={() => onSelectCoupon(c.id)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={label}
                        >
                          <Text
                            style={[styles.couponChipText, selected ? styles.couponChipTextActive : null]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {!suggestedCouponApplied &&
              suggestedCouponSavings > 0.009 &&
              suggestedCouponUserId &&
              onSelectCoupon ? (
                <Pressable
                  style={({ pressed }) => [styles.savingsBar, pressed ? styles.couponChipPressed : null]}
                  onPress={() => onSelectCoupon(suggestedCouponUserId)}
                  accessibilityRole="button"
                  accessibilityLabel={t("checkout.applySuggestedCouponA11y", {
                    amount: formatCurrency(suggestedCouponSavings),
                  })}
                >
                  <Text style={styles.savingsBarText}>
                    {t("checkout.applySuggestedCoupon", { amount: formatCurrency(suggestedCouponSavings) })}
                  </Text>
                </Pressable>
              ) : !suggestedCouponApplied && suggestedCouponSavings > 0.009 ? (
                <View style={styles.savingsBar}>
                  <Text style={styles.savingsBarText}>
                    {t("checkout.unusedCouponSavings", { amount: formatCurrency(suggestedCouponSavings) })}
                  </Text>
                </View>
              ) : null}
              {suggestedCouponApplied && suggestedCouponSavings > 0.009 ? (
                <View style={styles.suggestedRow}>
                  <Text style={styles.suggestedText}>
                    {t("checkout.suggestedCoupon", { amount: formatCurrency(suggestedCouponSavings) })}
                  </Text>
                </View>
              ) : null}
              {retentionDiscountAmount > 0.009 ? (
                <View style={styles.line}>
                  <Text style={styles.lineLabel}>{t("checkout.retentionCoupon")}</Text>
                  <Text style={styles.discountValue}>{formatCurrencyDiscount(retentionDiscountAmount)}</Text>
                </View>
              ) : null}
              {!hideShippingDetails && deliveryFee > 0 ? (
                <View style={styles.line}>
                  <Text style={styles.lineLabel}>{t("checkout.deliveryFee")}</Text>
                  <Text style={styles.lineValue}>{formatCurrency(deliveryFee)}</Text>
                </View>
              ) : null}
              {quoting ? <QuoteSkeletonRow label={t("checkout.quoting")} colors={colors} /> : null}
              <View style={[styles.line, styles.totalLine]}>
                <Text style={styles.totalLabel}>{t("checkout.total")}</Text>
                <Text style={styles.totalValue}>
                  {quoting ? "—" : formatCurrency(payAmount)}
                </Text>
              </View>
            </View>

            {!hideShippingDetails && addressSummary ? (
              <Pressable
                style={styles.addressCard}
                onPress={onEditAddress}
                disabled={!onEditAddress}
                accessibilityRole="button"
                accessibilityLabel={t("checkout.addressEdit")}
              >
                <Text style={styles.addressLabel}>{t("checkout.addressLabel")}</Text>
                <Text style={styles.addressText}>{addressSummary}</Text>
                {onEditAddress ? <Text style={styles.addressEdit}>{t("checkout.addressEditLink")}</Text> : null}
              </Pressable>
            ) : null}

            {hasAddress === false && onRequestAddress ? (
              hideShippingDetails ? (
                <View style={styles.addressMissingCompact} accessibilityRole="alert">
                  <Text style={styles.addressMissingText}>{t("checkout.needsAddress")}</Text>
                  <Pressable
                    style={styles.addressMissingBtn}
                    onPress={onRequestAddress}
                    accessibilityRole="button"
                    accessibilityLabel={t("checkout.addAddressA11y")}
                    testID="confirmAddAddressButton"
                  >
                    <Text style={styles.addressMissingBtnText}>{t("checkout.addAddress")}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.addressCard}
                  onPress={onRequestAddress}
                  accessibilityRole="button"
                  accessibilityLabel={t("checkout.addAddressA11y")}
                  testID="confirmAddAddressButton"
                >
                  <Text style={styles.addressLabel}>{t("checkout.needsAddress")}</Text>
                  <Text style={styles.addressEdit}>{t("checkout.addAddress")}</Text>
                </Pressable>
              )
            ) : null}

            {quoteError ? (
              <InlineSectionError
                message={t("checkout.quoteError", { message: quoteError })}
                onRetry={onRetryQuote}
                onContactSupport={() => void openContactSupport()}
              />
            ) : null}

            {spendLimitWarning ? (
              <Text style={styles.spendLimitWarn} accessibilityRole="alert">
                {spendLimitWarning}
              </Text>
            ) : null}

            <View style={styles.payCard} ref={payAreaRef} collapsable={false}>
              <Text style={styles.payMethodTitle}>{t("checkout.paymentMethod")}</Text>
              <PaymentMethodBadge selected />
              {momoEnabled ? (
                <View style={styles.payMethodRow}>
                  <Pressable
                    style={[styles.payMethodChip, paymentMethod === "default" ? styles.payMethodChipOn : null]}
                    onPress={() => setPaymentMethod("default")}
                    accessibilityRole="button"
                    accessibilityLabel={getPaymentMethodHint()}
                    accessibilityState={{ selected: paymentMethod === "default" }}
                  >
                    <Text style={styles.payMethodChipText}>{getPaymentMethodHint()}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.payMethodChip, paymentMethod === "momo" ? styles.payMethodChipOn : null]}
                    onPress={() => setPaymentMethod("momo")}
                    accessibilityRole="button"
                    accessibilityLabel={t("momo.methodLabel")}
                    accessibilityState={{ selected: paymentMethod === "momo" }}
                  >
                    <Text style={styles.payMethodChipText}>{t("momo.methodLabel")}</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={styles.payHint}>
                {paymentMethod === "momo" && momoEnabled
                  ? t("momo.continueHint")
                  : resolvePaymentMode() === "mock"
                    ? t("payment.mockTip")
                    : getPaymentMethodHint()}
              </Text>
            </View>

            <View style={styles.legalBlock}>
              <Text style={styles.trustLine}>{t("checkout.physicalFulfillmentNote")}</Text>
              <View style={styles.trustCard}>
                <Text style={styles.trustLine}>{t("checkout.oddsTitle", { defaultValue: "Probability disclosure" })}</Text>
                {probabilityRates ? (
                  <>
                    <Text style={styles.trustLine}>
                      {t("checkout.probabilityRates", {
                        legendary: (probabilityRates.legendaryRate / 100).toFixed(2),
                        hidden: (probabilityRates.hiddenRate / 100).toFixed(2),
                        general: (probabilityRates.generalRate / 100).toFixed(2),
                      })}
                    </Text>
                    {probabilityRates.adjusted ? (
                      <Text style={styles.trustLine}>{t("checkout.probabilityAdjustedNote")}</Text>
                    ) : probabilityRates.dynamicProbability !== false ? (
                      <Text style={styles.trustLine}>{t("checkout.probabilityDynamicNote")}</Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.trustLine}>{t("checkout.probabilityUnavailable", { defaultValue: "Published odds could not be loaded — open the probability page before paying, or retry." })}</Text>
                )}
                <FairnessTrustRow compact />
              </View>
              <Pressable
                onPress={() => setTermsExpanded((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={termsExpanded ? t("checkout.termsCollapse") : t("checkout.termsExpand")}
              >
                <Text style={styles.termsToggle}>
                  {termsExpanded ? `${t("checkout.termsCollapse")} ▴` : `${t("checkout.trustSummaryTitle")} ▾`}
                </Text>
              </Pressable>
              {termsExpanded ? (
                <View style={styles.trustCard}>
                  <Text style={styles.trustLine}>{t("checkout.trustLine1")}</Text>
                  <Text style={styles.trustLine}>{t("checkout.trustLine2")}</Text>
                  <Text style={styles.trustLine}>{t("checkout.trustLine3")}</Text>
                  {probabilityRates ? (
                    <>
                      <Text style={styles.trustLine}>
                        {t("checkout.probabilityRates", {
                          legendary: (probabilityRates.legendaryRate / 100).toFixed(2),
                          hidden: (probabilityRates.hiddenRate / 100).toFixed(2),
                          general: (probabilityRates.generalRate / 100).toFixed(2),
                        })}
                      </Text>
                      {probabilityRates.adjusted ? (
                        <Text style={styles.trustLine}>{t("checkout.probabilityAdjustedNote")}</Text>
                      ) : probabilityRates.dynamicProbability !== false ? (
                        <Text style={styles.trustLine}>{t("checkout.probabilityDynamicNote")}</Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.trustLine}>{t("checkout.probabilityUnavailable", { defaultValue: "Published odds could not be loaded — open the probability page before paying, or retry." })}</Text>
                  )}
                  {TERMS_KEYS.map((key, index) => (
                    <Text key={key} style={styles.termText}>
                      {index + 1}. {t(key)}
                    </Text>
                  ))}
                  <View style={styles.legalLinks}>
                    {LEGAL_LINKS.map((link) => (
                      <Pressable
                        key={link.key}
                        onPress={() => openLegalLink(link.url, link.view)}
                        accessibilityRole="link"
                        accessibilityLabel={t(link.key)}
                      >
                        <Text style={styles.legalLinkText}>{t(link.key)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.agreeWrap}>
            <AgreementCheckbox checked={agreed} onToggle={onToggleAgreed}>
              {t("checkout.agreeText")}
            </AgreementCheckbox>
          </View>
          <Animated.View style={ctaPulseStyle}>
            <Pressable
              testID="confirmPayButton"
              accessibilityRole="button"
              accessibilityLabel={t("checkout.payNow")}
              collapsable={false}
              style={({ pressed }) => [
                styles.payBtn,
                payDisabled ? styles.payBtnDisabled : pressed ? styles.payBtnPressed : null,
              ]}
              disabled={payDisabled}
              accessibilityHint={oddsMissing ? t("checkout.probabilityUnavailable") : undefined}
              onPress={() => {
                if (oddsMissing) return;
                onPay(paymentMethod === "momo" && momoEnabled ? "momo" : "default");
              }}
            >
              <LinearGradient
                colors={[colors.brand, colors.brandGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.payBtnGradient}
              >
                <Text style={styles.payBtnText}>
                  {paying
                    ? t("checkout.paySubmitting")
                    : oddsMissing
                      ? t("checkout.probabilityUnavailable")
                    : payBlocked
                      ? payBlockedHint || t("checkout.payBlocked")
                      : t("checkout.payNowAmount", { amount: formatCurrency(payAmount) })}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
          {deferPayLabel && onDeferPay ? (
            <Pressable style={styles.deferBtn} onPress={onDeferPay} accessibilityRole="button" accessibilityLabel={deferPayLabel || t("checkout.deferPay")}>
              <Text style={styles.deferText}>{deferPayLabel}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function buildConfirmOrderStyles(colors: ThemeColors) {
  return StyleSheet.create({
  mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  dismissArea: { flex: 1 },
  sheet: {
    maxHeight: "90%",
    backgroundColor: colors.bgPage,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
  },
  head: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    position: "relative",
  },
  title: { ...font("bodySemiBold"), fontSize: typography.h3, color: colors.brandText },
  deadline: { ...font("body"), fontSize: typography.caption, color: colors.accent, marginTop: 4 },
  closeBtn: { position: "absolute", right: spacing.lg, top: spacing.lg, padding: 4 },
  close: { fontSize: 28, color: colors.textMuted, lineHeight: 28 },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  spotlight: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.bgSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 168,
  },
  spotlightImage: { width: "100%", height: 168 },
  spotlightFade: { ...StyleSheet.absoluteFillObject, top: 60 },
  spotlightMeta: {
    position: "absolute",
    start: spacing.md,
    end: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  productName: { ...font("bodySemiBold"), color: colors.textPrimary, fontSize: typography.h3 },
  productPriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  unitPrice: { ...font("numeral"), color: colors.brandText, fontSize: typography.bodyLg },
  qtyBadge: { ...font("bodyMedium"), color: colors.textMuted },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  lineLabel: { ...font("body"), color: colors.textSecondary, fontSize: typography.caption },
  lineValue: { ...font("bodyMedium"), color: colors.textPrimary, fontSize: typography.caption },
  discountLabelWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  discountTag: {
    backgroundColor: colors.danger,
    borderRadius: 4,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  discountTagText: { color: colors.textOnBrand, fontSize: 10, fontWeight: "900" },
    discountValue: { ...font("bodySemiBold"), color: colors.danger, fontSize: typography.caption },
    suggestedRow: {
      marginTop: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.bgBrandSoft,
    },
    suggestedText: { ...font("bodyMedium"), fontSize: typography.micro, color: colors.brand },
    savingsBar: {
      marginTop: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.warningSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.warning,
    },
    savingsBarText: { ...font("bodySemiBold"), fontSize: typography.caption, color: colors.warning },
    couponPicker: { marginTop: spacing.sm, gap: spacing.xs },
    couponPickerLabel: { ...font("bodyMedium"), fontSize: typography.caption, color: colors.textSecondary },
    couponChipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    couponChip: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
      maxWidth: "100%",
    },
    couponChipActive: {
      borderColor: colors.brand,
      backgroundColor: colors.bgBrandSoft,
    },
    couponChipPressed: { opacity: 0.85 },
    couponChipText: { ...font("body"), fontSize: typography.micro, color: colors.textMuted },
    couponChipTextActive: { ...font("bodySemiBold"), color: colors.brandText },
  totalLine: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  totalLabel: { ...font("bodySemiBold"), fontSize: typography.body, color: colors.textPrimary },
  totalValue: { ...font("numeral"), fontSize: typography.h3, color: colors.brandText },
  addressCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  addressLabel: { ...font("bodyMedium"), fontSize: typography.caption, color: colors.textSecondary },
  addressText: { ...font("body"), color: colors.textPrimary, fontSize: typography.caption, lineHeight: 20 },
  addressEdit: { ...font("bodyMedium"), color: colors.link, fontSize: typography.caption, marginTop: 4 },
  addressMissingCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.warningSoftBorder,
  },
  addressMissingText: {
    flex: 1,
    ...font("bodySemiBold"),
    fontSize: typography.caption,
    color: colors.textPrimary,
  },
  addressMissingBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
  },
  addressMissingBtnText: { ...font("bodySemiBold"), color: colors.textOnBrand, fontSize: typography.caption },
  payCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  payHint: { ...font("body"), color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  payMethodTitle: { ...font("bodySemiBold"), color: colors.textPrimary, fontSize: typography.caption, marginBottom: spacing.xs },
  payMethodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs },
  payMethodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  payMethodChipOn: { backgroundColor: colors.bgBrandSoft, borderColor: colors.brand },
  payMethodChipText: { ...font("bodyMedium"), fontSize: typography.caption, color: colors.textPrimary },
  legalBlock: { gap: spacing.sm },
  legalLinks: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  legalLinkText: { ...font("body"), color: colors.textMuted, fontSize: typography.micro, textDecorationLine: "underline" },
  trustCard: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  trustLine: { ...font("body"), color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  spendLimitWarn: {
    marginBottom: spacing.sm,
    color: colors.orderUnpaidText,
    fontSize: typography.caption,
    fontWeight: "600",
    backgroundColor: colors.orderUnpaidBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.orderUnpaidBorder,
  },
  termsToggle: { ...font("bodyMedium"), color: colors.textMuted, fontSize: typography.caption, textAlign: "center" },
  terms: { gap: 6 },
  termText: { ...font("body"), color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  payBtn: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  payBtnGradient: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.55 },
  payBtnPressed: { opacity: 0.9 },
  payBtnText: { ...font("bodySemiBold"), color: colors.textOnBrand, fontSize: typography.bodyLg },
  deferBtn: { marginHorizontal: spacing.lg, marginTop: spacing.sm, alignItems: "center", paddingVertical: spacing.sm },
  deferText: { ...font("bodyMedium"), color: colors.textSecondary, fontSize: typography.caption },
  agreeWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  });
}
