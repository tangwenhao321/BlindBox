import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  createVipOrder,
  fetchCurrentVip,
  fetchVipOrder,
  fetchVipPackages,
  isVipOrderPaid,
  prepayVipOrder,
  type VipPackage,
} from "../services/vipService";
import { getCheckInStatus } from "../services/welfareService";
import { computeMemberLevelProgress } from "../utils/memberLevel";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { formatCurrency } from "../utils/formatCurrency";
import { parseError } from "../api";
import { toast } from "../utils/toast";
import { resolvePaymentMode } from "../config/payment";
import { invokeWechatPay } from "../utils/wechatPay";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import { isIapClientEnabled, purchaseVipPackage, verifyVipIapWithBackend } from "../services/iapService";

type Props = {
  onBack: () => void;
  onRequireLogin?: () => void;
};

const BENEFIT_KEYS = ["vip.benefit1", "vip.benefit2", "vip.benefit3", "vip.benefit4"] as const;
const MOMO_ENV_ENABLED = process.env.EXPO_PUBLIC_MOMO_ENABLED === "true";

export function VipBenefitsView({ onBack, onRequireLogin }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const styles = useThemedStyles(buildVipStyles);
  const { momoEnabled: momoServerEnabled } = useAppPublicConfig();
  const [endTime, setEndTime] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [luckyCoins, setLuckyCoins] = useState(0);
  const [checkedToday, setCheckedToday] = useState(false);
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [checkingPay, setCheckingPay] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();
  const levelProgress = computeMemberLevelProgress(luckyCoins);
  const momoAvailable =
    Platform.OS !== "ios" && MOMO_ENV_ENABLED && momoServerEnabled === true && resolvePaymentMode() === "vnpay";
  const stopPollRef = useRef(false);
  const checkingRef = useRef(false);

  const reload = useCallback(async () => {
    if (!token) {
      setEndTime(null);
      setLuckyCoins(0);
      setCheckedToday(false);
      setPackages([]);
      setLoaded(true);
      return;
    }
    await runLoad(async () => {
      const [vip, checkIn, pkgs] = await Promise.all([
        fetchCurrentVip(token),
        getCheckInStatus(token),
        fetchVipPackages(token).catch(() => [] as VipPackage[]),
      ]);
      setEndTime(vip?.endTime ?? null);
      setLuckyCoins(checkIn.luckyCoins);
      setCheckedToday(checkIn.checkedToday);
      setPackages(pkgs);
      setLoaded(true);
    });
  }, [token, runLoad]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const checkPendingPayment = useCallback(async () => {
    if (!token || !pendingOrderId || checkingRef.current) return;
    checkingRef.current = true;
    setCheckingPay(true);
    try {
      const order = await fetchVipOrder(token, pendingOrderId);
      if (isVipOrderPaid(order)) {
        stopPollRef.current = true;
        setPendingOrderId(null);
        toast.success(t("vip.paySuccess"));
        await reload();
      }
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      checkingRef.current = false;
      setCheckingPay(false);
    }
  }, [pendingOrderId, reload, t, token]);

  useEffect(() => {
    if (!pendingOrderId || !token) return;
    stopPollRef.current = false;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && !stopPollRef.current) {
        void checkPendingPayment();
      }
    });
    const timer = setInterval(() => {
      if (stopPollRef.current) return;
      void checkPendingPayment();
    }, 3000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [checkPendingPayment, pendingOrderId, token]);

  const active = endTime ? new Date(endTime).getTime() > Date.now() : false;
  const showSkeleton = !!token && shouldShowListSkeleton(loading, loaded ? 1 : 0, loadError);

  const progressLine = useMemo(() => {
    const base =
      levelProgress.nextLevelAt != null
        ? t("vip.upgradeHint", {
            count: Math.max(0, levelProgress.nextLevelAt - levelProgress.currentPoints),
          })
        : t("vip.maxLevel");
    return base + (checkedToday ? t("vip.checkedTodaySuffix") : t("vip.checkInPendingSuffix"));
  }, [levelProgress, checkedToday, t]);

  const buyPackage = async (pkg: VipPackage, wallet: "market" | "momo" = "market") => {
    if (!token || !pkg.id || buyingId) return;
    // Guideline 3.1.1: digital VIP must use IAP on iOS — external wallets blocked.
    if (Platform.OS === "ios") {
      if (!isIapClientEnabled()) {
        toast.info(t("vip.iosUnavailableDesc"));
        return;
      }
      setBuyingId(pkg.id);
      try {
        // StoreKit + Server API not wired yet — fail closed without creating a wallet order.
        const purchase = await purchaseVipPackage(pkg.id);
        const orderId = await createVipOrder(token, pkg.id);
        await verifyVipIapWithBackend(token, orderId, purchase.transactionId, purchase.signedPayload);
        toast.success(t("vip.paySuccess"));
        await reload();
      } catch (error) {
        toast.error(parseError(error));
      } finally {
        setBuyingId(null);
      }
      return;
    }
    setBuyingId(pkg.id);
    try {
      const orderId = await createVipOrder(token, pkg.id);
      const launch = await prepayVipOrder(token, orderId, wallet);
      if (launch.channel === "mock") {
        toast.success(t("vip.paySuccess"));
        setPendingOrderId(null);
        await reload();
        return;
      }
      if (launch.channel === "wechat") {
        if (launch.wechatPrepay) {
          const ok = await invokeWechatPay(launch.wechatPrepay);
          if (ok) {
            setPendingOrderId(orderId);
            toast.info(t("vip.payReturnHint"));
            return;
          }
        }
        toast.info(t("vip.payWechatReady"));
        setPendingOrderId(orderId);
        return;
      }
      const url = launch.paymentUrl || launch.deeplink;
      if (url) {
        const can = await Linking.canOpenURL(url);
        if (can) await Linking.openURL(url);
        else toast.error(t("vip.payOpenFailed"));
      } else {
        toast.info(t("vip.payStarted"));
      }
      setPendingOrderId(orderId);
      toast.info(t("vip.payReturnHint"));
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("vip.title")} onBack={onBack} />
      <ScreenScaffold contentContainerStyle={styles.content}>
        {Platform.OS === "ios" ? (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>{t("vip.iosUnavailableTitle")}</Text>
            <Text style={styles.guestDesc}>{t("vip.iosUnavailableDesc")}</Text>
            <Pressable
              style={styles.loginBtn}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t("vip.goBack")}
            >
              <Text style={styles.loginBtnText}>{t("vip.goBack")}</Text>
            </Pressable>
          </View>
        ) : !token ? (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>{t("vip.guestEmptyTitle")}</Text>
            <Text style={styles.guestDesc}>{t("vip.guestEmptyDesc")}</Text>
            {onRequireLogin ? (
              <Pressable
                style={styles.loginBtn}
                onPress={onRequireLogin}
                accessibilityRole="button"
                accessibilityLabel={t("vip.goLogin")}
              >
                <Text style={styles.loginBtnText}>{t("vip.goLogin")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {Platform.OS !== "ios" && token && loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
        {Platform.OS !== "ios" && showSkeleton ? (
          <ListSkeleton rows={2} />
        ) : Platform.OS !== "ios" && token ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroShelf} />
              <Text style={styles.heroLabel}>{active ? t("vip.vipActive") : t("vip.regularUser")}</Text>
              <Text style={styles.heroTitle}>
                {t("vip.levelTitle", { level: levelProgress.level, title: levelProgress.title })}
              </Text>
              <View style={styles.levelBarTrack}>
                <View style={[styles.levelBarFill, { width: `${Math.round(levelProgress.progress * 100)}%` }]} />
              </View>
              <Text style={styles.heroMeta}>{progressLine}</Text>
              {endTime ? (
                <Text style={styles.heroMeta}>
                  {t("vip.vipUntil", { time: endTime.replace("T", " ").slice(0, 16) })}
                </Text>
              ) : (
                <Text style={styles.heroMeta}>{t("vip.noVip")}</Text>
              )}
            </View>
            <Text style={styles.sectionTitle}>{t("vip.benefitsTitle")}</Text>
            {BENEFIT_KEYS.map((key) => (
              <View key={key} style={styles.row}>
                <View style={styles.bulletDot} />
                <Text style={styles.rowText}>{t(key)}</Text>
              </View>
            ))}
            {pendingOrderId ? (
              <View style={styles.pendingCard}>
                <Text style={styles.packageName}>{t("vip.pendingPayTitle")}</Text>
                <Text style={styles.packagesHint}>{t("vip.pendingPayHint")}</Text>
                <Pressable
                  style={[styles.buyBtn, checkingPay ? styles.buyBtnDisabled : null]}
                  disabled={checkingPay}
                  onPress={() => void checkPendingPayment()}
                  accessibilityRole="button"
                  accessibilityLabel={t("vip.refreshPayStatus")}
                >
                  <Text style={styles.buyBtnText}>
                    {checkingPay ? t("vip.buying") : t("vip.refreshPayStatus")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>{t("vip.packagesTitle")}</Text>
            <Text style={styles.packagesHint}>{t("vip.packagesHint")}</Text>
            {packages.length === 0 ? (
              <Text style={styles.packagesHint}>{t("vip.packagesEmpty")}</Text>
            ) : (
              packages.map((pkg) => (
                <View key={pkg.id} style={styles.packageCard}>
                  <View style={styles.packageTextCol}>
                    <Text style={styles.packageName}>{pkg.name || t("vip.packageFallback")}</Text>
                    <Text style={styles.packageMeta}>
                      {t("vip.packageDays", { days: pkg.days ?? 0 })} · {formatCurrency(Number(pkg.price ?? 0))}
                    </Text>
                  </View>
                  <View style={styles.packageActions}>
                    <Pressable
                      style={[styles.buyBtn, buyingId === pkg.id ? styles.buyBtnDisabled : null]}
                      disabled={!!buyingId}
                      onPress={() => void buyPackage(pkg, "market")}
                      accessibilityRole="button"
                      accessibilityLabel={t("vip.buyPackage")}
                    >
                      <Text style={styles.buyBtnText}>
                        {buyingId === pkg.id ? t("vip.buying") : t("vip.buyPackage")}
                      </Text>
                    </Pressable>
                    {momoAvailable ? (
                      <Pressable
                        style={[styles.buyBtnSecondary, buyingId === pkg.id ? styles.buyBtnDisabled : null]}
                        disabled={!!buyingId}
                        onPress={() => void buyPackage(pkg, "momo")}
                        accessibilityRole="button"
                        accessibilityLabel={t("vip.buyWithMomo")}
                      >
                        <Text style={styles.buyBtnSecondaryText}>{t("vip.buyWithMomo")}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}
        {Platform.OS !== "ios" ? <Text style={styles.legal}>{t("vip.legal")}</Text> : null}
      </ScreenScaffold>
    </View>
  );
}

function buildVipStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    content: { paddingBottom: layout.screenPaddingBottom, gap: spacing.md },
    guestCard: {
      backgroundColor: colors.bgBrandSoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      gap: spacing.sm,
    },
    guestTitle: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
    guestDesc: { color: colors.textSecondary, fontSize: typography.body, lineHeight: 22 },
    loginBtn: {
      marginTop: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
    },
    loginBtnText: { color: colors.textOnBrand, fontWeight: "800" },
    hero: {
      backgroundColor: colors.bgBrandSoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      paddingTop: spacing.lg + 4,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      overflow: "hidden",
    },
    heroShelf: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 8,
      backgroundColor: colors.shelfLip,
      borderBottomWidth: 2,
      borderBottomColor: colors.brandDark,
    },
    heroLabel: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    heroTitle: { marginTop: spacing.xs, fontSize: typography.h3, fontWeight: "900", color: colors.textPrimary },
    heroMeta: { marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.caption, lineHeight: 20 },
    levelBarTrack: {
      marginTop: spacing.sm,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bgSoft,
      overflow: "hidden",
    },
    levelBarFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 4 },
    sectionTitle: { fontWeight: "900", fontSize: typography.bodyLg, color: colors.textPrimary },
    packagesHint: { color: colors.textMuted, fontSize: typography.caption, marginTop: -spacing.sm },
    pendingCard: {
      backgroundColor: colors.bgBrandSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.chipBorder,
      gap: spacing.sm,
    },
    row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
    bulletDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.brand,
      marginTop: 7,
    },
    rowText: { flex: 1, color: colors.textSecondary, lineHeight: 22 },
    packageCard: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    packageTextCol: { gap: 4 },
    packageName: { fontWeight: "800", color: colors.textPrimary, fontSize: typography.body },
    packageMeta: { color: colors.textSecondary, fontSize: typography.caption },
    packageActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    buyBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    buyBtnSecondary: {
      backgroundColor: colors.bgSoft,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buyBtnDisabled: { opacity: 0.55 },
    buyBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
    buyBtnSecondaryText: { color: colors.textPrimary, fontWeight: "700", fontSize: typography.caption },
    legal: { marginTop: spacing.md, color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  });
}
