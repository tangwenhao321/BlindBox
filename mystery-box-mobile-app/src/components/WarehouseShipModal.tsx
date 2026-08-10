import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { PrimaryButton } from "./ui/PrimaryButton";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { Address } from "../types";
import {
  quoteWarehouseShip,
  submitWarehouseShip,
  type ShipLinePayload,
  type ShipQuote,
} from "../services/warehouseShipService";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { queueIfOffline } from "../utils/offlineSubmitGuard";
import { trackEvent } from "../utils/analytics";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  visible: boolean;
  authToken: string;
  items: ShipLinePayload[];
  addresses: Address[];
  selectedAddressId: string;
  onSelectAddress: (id: string) => void;
  onOpenAddressManage?: () => void;
  onClose: () => void;
  onSubmitted: () => void;
  onViewShipRequests?: () => void;
};

function formatAddressLine(address: Address) {
  return `${address.realName} ${address.phoneNumber}\n${address.details}${address.houseNumber || ""}`;
}

export function WarehouseShipModal({
  visible,
  authToken,
  items,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onOpenAddressManage,
  onClose,
  onSubmitted,
  onViewShipRequests,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(buildWarehouseShipStyles);
  const [quote, setQuote] = useState<ShipQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const footerInset = Math.max(insets.bottom, spacing.sm) + spacing.md;

  const ensureDefaultAddress = useCallback(() => {
    if (!visible || !addresses.length || selectedAddressId) return;
    const preferred = addresses.find((a) => a.top) ?? addresses[0];
    if (preferred) onSelectAddress(preferred.id);
  }, [addresses, onSelectAddress, selectedAddressId, visible]);

  const reloadQuote = useCallback(async () => {
    if (!visible || !selectedAddressId || !items.length || submitted) return;
    setLoading(true);
    try {
      setQuote(await quoteWarehouseShip(authToken, selectedAddressId, items));
    } catch (error) {
      setQuote(null);
      toast.error(parseError(error));
    } finally {
      setLoading(false);
    }
  }, [authToken, items, selectedAddressId, visible, submitted]);

  useEffect(() => {
    if (!visible) {
      setSubmitted(false);
      setQuote(null);
      setSubmitError(null);
      return;
    }
    ensureDefaultAddress();
  }, [visible, ensureDefaultAddress]);

  useEffect(() => {
    void reloadQuote();
  }, [reloadQuote]);

  const handleSubmit = () => {
    if (!selectedAddressId) {
      toast.error(t("warehouseShip.selectAddressError"));
      return;
    }
    if (!quote) {
      toast.error(t("warehouseShip.waitQuoteError"));
      return;
    }

    const perform = async () => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        await submitWarehouseShip(authToken, selectedAddressId, items);
        setSubmitted(true);
        setSubmitError(null);
        trackEvent("warehouse_ship_submit", { itemCount: items.length });
        onSubmitted();
      } catch (error) {
        const message = parseError(error);
        setSubmitError(message);
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    };

    if (
      queueIfOffline(i18n.t("offline.actionShip"), perform, {
        kind: "warehouseShipSubmit",
        token: authToken,
        payload: { addressId: selectedAddressId, items },
      })
    ) {
      return;
    }
    void perform();
  };

  const handleDone = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.mask}
        onPress={submitted ? undefined : onClose}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
      >
        <Pressable style={[styles.sheet, { paddingBottom: footerInset }]} onPress={(e) => e.stopPropagation()}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {submitted ? (
              <View style={styles.successBlock}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.title}>{t("warehouseShip.successTitle")}</Text>
                <Text style={styles.sub}>{t("warehouseShip.successSub")}</Text>
                {onViewShipRequests ? (
                  <PrimaryButton
                    label={t("warehouseShip.viewRequests")}
                    onPress={() => {
                      handleDone();
                      onViewShipRequests();
                    }}
                  />
                ) : null}
                <PrimaryButton label={t("warehouseShip.done")} variant="secondary" onPress={handleDone} />
                <Text style={styles.successTrackHint}>{t("warehouseShip.successTrackHint")}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.title}>{t("warehouseShip.title")}</Text>
                <Text style={styles.sub}>{t("warehouseShip.selectedCount", { count: items.length })}</Text>

                {items.length === 0 ? <Text style={styles.warn}>{t("warehouseShip.noItemsWarn")}</Text> : null}

                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionLabel}>{t("warehouseShip.addressLabel")}</Text>
                    {onOpenAddressManage ? (
                      <Pressable
                        onPress={onOpenAddressManage}
                        accessibilityRole="button"
                        accessibilityLabel={t("warehouseShip.manageAddress")}
                      >
                        <Text style={styles.link}>{t("warehouseShip.manageAddress")}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.addrScroll}>
                    {addresses.map((addr) => {
                      const active = addr.id === selectedAddressId;
                      return (
                        <Pressable
                          key={addr.id}
                          style={[styles.addrCard, active ? styles.addrCardOn : null]}
                          onPress={() => onSelectAddress(addr.id)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          accessibilityLabel={`${addr.realName}. ${formatAddressLine(addr)}`}
                        >
                          <Text style={[styles.addrName, active ? styles.addrNameOn : null]}>{addr.realName}</Text>
                          <Text style={[styles.addrLine, active ? styles.addrLineOn : null]} numberOfLines={2}>
                            {formatAddressLine(addr)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {!addresses.length ? (
                    <Pressable
                      onPress={onOpenAddressManage}
                      accessibilityRole="button"
                      accessibilityLabel={t("warehouseShip.addAddressFirst")}
                    >
                      <Text style={styles.warn}>{t("warehouseShip.addAddressFirst")}</Text>
                    </Pressable>
                  ) : !selectedAddressId ? (
                    <Text style={styles.hint}>{t("warehouseShip.selectAddressHint")}</Text>
                  ) : null}
                </View>

                <View style={styles.quoteCard}>
                  {loading ? (
                    <ActivityIndicator color={colors.brand} />
                  ) : quote ? (
                    <>
                      <Text style={styles.quoteRow}>
                        {t("warehouseShip.quoteRow", {
                          order: quote.orderRemindCount,
                          market: quote.marketplaceCount,
                        })}
                      </Text>
                      <Text style={styles.quoteRow}>
                        {t("warehouseShip.deliveryFee", { amount: formatCurrency(Number(quote.deliveryFee)) })}
                      </Text>
                      <Text style={styles.quotePay}>
                        {t("warehouseShip.payAmount", { amount: formatCurrency(Number(quote.payAmount)) })}
                      </Text>
                      <Text style={styles.hint}>{quote.feeHint}</Text>
                    </>
                  ) : (
                    <Text style={styles.hint}>
                      {selectedAddressId ? t("warehouseShip.quotingWaiting") : t("warehouseShip.quotingNeedAddress")}
                    </Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          {!submitted ? (
            <View style={styles.footer}>
              {submitError ? (
                <View style={styles.errorBlock}>
                  <Text style={styles.errorText}>{submitError}</Text>
                  <PrimaryButton
                    label={t("warehouseShip.retrySubmit")}
                    loading={submitting}
                    disabled={!quote || submitting}
                    onPress={handleSubmit}
                  />
                </View>
              ) : null}

              <PrimaryButton
                label={submitting ? t("warehouseShip.submitting") : t("warehouseShip.submit")}
                loading={submitting}
                disabled={!quote || submitting || !addresses.length || !selectedAddressId || items.length === 0}
                onPress={handleSubmit}
              />
              <Pressable
                style={styles.cancelBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("common.cancel")}
              >
                <Text style={styles.cancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildWarehouseShipStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bgPage,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      maxHeight: "90%",
    },
    scroll: { flexGrow: 0, flexShrink: 1 },
    scrollContent: { paddingBottom: spacing.sm },
    footer: {
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    title: { fontSize: typography.h4, fontWeight: "900", color: colors.textPrimary, textAlign: "center" },
    sub: { textAlign: "center", color: colors.textSecondary, fontSize: typography.caption, marginBottom: spacing.md },
    successBlock: { gap: spacing.md, paddingVertical: spacing.lg },
    successIcon: { textAlign: "center", fontSize: 48, color: colors.successStrong, fontWeight: "900" },
    successTrackHint: { textAlign: "center", color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
    section: { gap: spacing.sm, marginBottom: spacing.md },
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    sectionLabel: { fontWeight: "800", color: colors.textPrimary },
    link: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    addrScroll: { maxHeight: 110 },
    addrCard: {
      width: 200,
      marginRight: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
    },
    addrCardOn: { borderColor: colors.brand, backgroundColor: colors.bgBrandSoft },
    addrName: { fontWeight: "800", color: colors.textPrimary, marginBottom: 4 },
    addrNameOn: { color: colors.brandText },
    addrLine: { fontSize: typography.micro, color: colors.textMuted, lineHeight: 16 },
    addrLineOn: { color: colors.textSecondary },
    warn: { color: colors.danger, fontSize: typography.caption, fontWeight: "700" },
    quoteCard: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs,
      minHeight: 100,
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    quoteRow: { color: colors.textSecondary, fontSize: typography.caption },
    quotePay: { fontSize: typography.h3, fontWeight: "900", color: colors.brand, marginTop: spacing.xs },
    hint: { color: colors.textMuted, fontSize: typography.micro, lineHeight: 18, marginTop: spacing.xs },
    errorBlock: { gap: spacing.sm, marginBottom: spacing.sm },
    errorText: { color: colors.danger, fontSize: typography.caption, lineHeight: 20, textAlign: "center" },
    cancelBtn: { alignItems: "center", paddingVertical: spacing.sm },
    cancelText: { color: colors.textMuted, fontWeight: "700" },
  });
}
