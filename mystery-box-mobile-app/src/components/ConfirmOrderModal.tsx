import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { PayCountdownText } from "./ui/PayCountdownText";
import { getPaymentMode, resolvePaymentMode } from "../config/payment";
import { measureAnchor, useOnboardingAnchors } from "../context/OnboardingAnchorContext";
import { AgreementCheckbox } from "./ui/AgreementCheckbox";
import { PaymentMethodBadge } from "./ui/PaymentMethodBadge";
import { InlineSectionError } from "./ui/InlineSectionError";
import { RemoteImage } from "./ui/RemoteImage";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { getPaymentMethodHint } from "../config/payment";
import { resolveBoxImageUrl } from "../utils/boxImage";
import { formatCurrency, formatCurrencyDiscount } from "../utils/formatCurrency";
import { openContactSupport } from "../utils/contactSupport";
import { resolveLegalLink } from "../utils/legalLinks";
import { usePendingPaymentCountdownLabels } from "../hooks/usePendingPaymentCountdownLabels";
import type { MysteryBox } from "../types";

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
  paying?: boolean;
  agreed: boolean;
  payBlocked?: boolean;
  payBlockedHint?: string;
  payDeadlineLabel?: string;
  payDeadlineIso?: string;
  addressSummary?: string | null;
  onEditAddress?: () => void;
  onToggleAgreed: () => void;
  onClose: () => void;
  onPay: (wallet?: "default" | "momo") => void;
  deferPayLabel?: string;
  onDeferPay?: () => void;
  suggestedCouponSavings?: number;
  suggestedCouponApplied?: boolean;
  spendLimitWarning?: string | null;
  spendLimitBlocked?: boolean;
  /** Open-box checkout: hide address and freight (only shown when applying to ship). */
  hideShippingDetails?: boolean;
};

const TERMS_KEYS = [
  "checkout.terms1",
  "checkout.terms2",
  "checkout.terms3",
  "checkout.terms4",
  "checkout.terms5",
] as const;

const MOMO_ENABLED = process.env.EXPO_PUBLIC_MOMO_ENABLED === "true";

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
  paying,
  agreed,
  payBlocked,
  payBlockedHint,
  payDeadlineLabel,
  payDeadlineIso,
  addressSummary,
  onEditAddress,
  onToggleAgreed,
  onClose,
  onPay,
  deferPayLabel,
  onDeferPay,
  suggestedCouponSavings = 0,
  suggestedCouponApplied,
  spendLimitWarning,
  spendLimitBlocked = false,
  hideShippingDetails = false,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildConfirmOrderStyles);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"default" | "momo">("default");
  const payAreaRef = useRef<View>(null);
  const { setAnchor } = useOnboardingAnchors();
  const countdownLabels = usePendingPaymentCountdownLabels();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => measureAnchor(payAreaRef, "payArea", setAnchor), 300);
    return () => clearTimeout(timer);
  }, [visible, setAnchor]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} testID="confirmOrderModal">
      <View style={styles.mask}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("checkout.close")}
        />
        <View style={styles.sheet}>
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
            <View style={styles.card}>
              <View style={styles.productRow}>
                <RemoteImage uri={resolveBoxImageUrl(box)} style={styles.thumb} />
                <View style={styles.productMeta}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {box.name}
                  </Text>
                  <View style={styles.productPriceRow}>
                    <Text style={styles.unitPrice}>{formatCurrency(unitPrice)}</Text>
                    <Text style={styles.qtyBadge}>x{drawCount}</Text>
                  </View>
                </View>
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
              {!suggestedCouponApplied && suggestedCouponSavings > 0.009 ? (
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
              {quoting ? (
                <View style={styles.quotingRow}>
                  <ActivityIndicator size="small" color={colors.brand} />
                  <Text style={styles.quotingText}>{t("checkout.quoting")}</Text>
                </View>
              ) : null}
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

            <View style={styles.trustCard}>
              <Text style={styles.trustTitle}>{t("checkout.trustSummaryTitle")}</Text>
              <Text style={styles.trustLine}>{t("checkout.trustLine1")}</Text>
              <Text style={styles.trustLine}>{t("checkout.trustLine2")}</Text>
              <Text style={styles.trustLine}>{t("checkout.trustLine3")}</Text>
            </View>

            {quoteError ? (
              <InlineSectionError
                message={t("checkout.quoteError", { message: quoteError })}
                onRetry={undefined}
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
              {MOMO_ENABLED ? (
                <View style={styles.payMethodRow}>
                  <Pressable
                    style={[styles.payMethodChip, paymentMethod === "default" ? styles.payMethodChipOn : null]}
                    onPress={() => setPaymentMethod("default")}
                    accessibilityRole="button"
                    accessibilityState={{ selected: paymentMethod === "default" }}
                  >
                    <Text style={styles.payMethodChipText}>{getPaymentMethodHint()}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.payMethodChip, paymentMethod === "momo" ? styles.payMethodChipOn : null]}
                    onPress={() => setPaymentMethod("momo")}
                    accessibilityRole="button"
                    accessibilityState={{ selected: paymentMethod === "momo" }}
                  >
                    <Text style={styles.payMethodChipText}>{t("momo.methodLabel")}</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={styles.payHint}>
                {paymentMethod === "momo" && MOMO_ENABLED
                  ? t("momo.stubHint")
                  : resolvePaymentMode() === "mock"
                    ? t("payment.mockTip")
                    : getPaymentMethodHint()}
              </Text>
            </View>

            <View style={styles.legalLinks}>
              {LEGAL_LINKS.map((link) => (
                <Pressable
                  key={link.key}
                  onPress={() => openLegalLink(link.url, link.view)}
                  accessibilityRole="link"
                >
                  <Text style={styles.legalLinkText}>{t(link.key)}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setTermsExpanded((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={termsExpanded ? t("checkout.termsCollapse") : t("checkout.termsExpand")}
            >
              <Text style={styles.termsToggle}>{termsExpanded ? `${t("checkout.termsCollapse")} ▲` : `${t("checkout.termsExpand")} ▼`}</Text>
            </Pressable>
            {termsExpanded ? (
              <View style={styles.terms}>
                {TERMS_KEYS.map((key, index) => (
                  <Text key={key} style={styles.termText}>
                    {index + 1}. {t(key)}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <Pressable
            testID="confirmPayButton"
            accessibilityLabel={t("checkout.payNow")}
            collapsable={false}
            style={[
              styles.payBtn,
              (!agreed || quoting || paying || payBlocked || quoteError || spendLimitBlocked) && styles.payBtnDisabled,
            ]}
            disabled={!agreed || quoting || paying || payBlocked || Boolean(quoteError) || spendLimitBlocked}
            onPress={() => onPay(paymentMethod === "momo" && MOMO_ENABLED ? "momo" : "default")}
          >
            <Text style={styles.payBtnText}>
              {paying
                ? t("checkout.paySubmitting")
                : payBlocked
                  ? payBlockedHint || t("checkout.payBlocked")
                  : t("checkout.payNowAmount", { amount: formatCurrency(payAmount) })}
            </Text>
          </Pressable>
          {deferPayLabel && onDeferPay ? (
            <Pressable style={styles.deferBtn} onPress={onDeferPay} accessibilityRole="button" accessibilityLabel={deferPayLabel || t("checkout.deferPay")}>
              <Text style={styles.deferText}>{deferPayLabel}</Text>
            </Pressable>
          ) : null}
          <View style={styles.agreeWrap}>
            <AgreementCheckbox checked={agreed} onToggle={onToggleAgreed}>
              {t("checkout.agreeText")}
            </AgreementCheckbox>
          </View>
        </View>
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
  },
  head: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    position: "relative",
  },
  title: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
  deadline: { fontSize: typography.caption, color: colors.accent, marginTop: 4 },
  closeBtn: { position: "absolute", right: spacing.lg, top: spacing.lg, padding: 4 },
  close: { fontSize: 28, color: colors.textMuted, lineHeight: 28 },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  productRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.bgSoft },
  productMeta: { flex: 1, gap: spacing.xs },
  productName: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.body },
  productPriceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  unitPrice: { color: colors.textSecondary, fontWeight: "700" },
  qtyBadge: { color: colors.textMuted, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  lineLabel: { color: colors.textSecondary, fontSize: typography.caption },
  lineValue: { color: colors.textPrimary, fontWeight: "700", fontSize: typography.caption },
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
    discountValue: { color: colors.danger, fontWeight: "800", fontSize: typography.caption },
    suggestedRow: {
      marginTop: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.bgBrandSoft,
    },
    suggestedText: { fontSize: typography.micro, color: colors.brand, fontWeight: "700" },
    savingsBar: {
      marginTop: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    savingsBarText: { fontSize: typography.caption, color: colors.warning, fontWeight: "800" },
  totalLine: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  totalLabel: { fontSize: typography.body, fontWeight: "800", color: colors.textPrimary },
  totalValue: { fontSize: typography.h3, fontWeight: "900", color: colors.textPrimary },
  addressCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  addressLabel: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: "700" },
  addressText: { color: colors.textPrimary, fontSize: typography.caption, lineHeight: 20 },
  addressEdit: { color: colors.link, fontWeight: "700", fontSize: typography.caption, marginTop: 4 },
  payCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  payHint: { color: colors.textMuted, fontSize: typography.micro, lineHeight: 16 },
  payMethodTitle: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.caption, marginBottom: spacing.xs },
  payMethodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs },
  payMethodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payMethodChipOn: { backgroundColor: colors.bgBrandSoft, borderColor: colors.brand },
  payMethodChipText: { fontSize: typography.caption, fontWeight: "700", color: colors.textPrimary },
  legalLinks: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  legalLinkText: { color: colors.brand, fontSize: typography.caption, fontWeight: "700", textDecorationLine: "underline" },
  trustCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  trustTitle: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.caption },
  trustLine: { color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  quotingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quotingText: { color: colors.textSecondary, fontSize: typography.caption },
  quoteError: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.danger,
    fontSize: typography.caption,
    fontWeight: "600",
  },
  spendLimitWarn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.orderUnpaidText,
    fontSize: typography.caption,
    fontWeight: "600",
    backgroundColor: colors.orderUnpaidBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.orderUnpaidBorder,
  },
  termsToggle: { color: colors.link, fontWeight: "700", fontSize: typography.caption, textAlign: "center" },
  terms: { gap: 6 },
  termText: { color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  payBtn: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.55 },
  payBtnText: { color: colors.textOnBrand, fontWeight: "900", fontSize: typography.bodyLg },
  deferBtn: { marginHorizontal: spacing.lg, marginTop: spacing.sm, alignItems: "center", paddingVertical: spacing.sm },
  deferText: { color: colors.textSecondary, fontWeight: "700", fontSize: typography.caption },
  agreeWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  });
}
