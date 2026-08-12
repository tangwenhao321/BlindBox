import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { parseError } from "../api";
import { formatCurrency } from "../utils/formatCurrency";
import { daysUntilCouponExpiry, isCouponExpiringSoon } from "../utils/couponExpiry";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAuthToken } from "../hooks/useAuthToken";
import { useCouponsQuery } from "../query/hooks/useCouponsQuery";
import { EmptyState } from "./EmptyState";
import { SubPageHeader } from "./ui/SubPageHeader";
import { SubPageShelfAccent } from "./ui/SubPageShelfAccent";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { layout, radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  onBack: () => void;
  onGoWelfare?: () => void;
  onGoMall?: () => void;
  onOpenBox?: (boxId: string) => void;
  onRequireLogin?: () => void;
};

export function CouponsView({ onBack, onGoWelfare, onGoMall, onOpenBox, onRequireLogin }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildCouponsStyles);
  const { data: items = [], isLoading, isFetching, error, refetch } = useCouponsQuery(token);
  const loadError = error ? parseError(error) : null;
  const refreshing = isFetching && !isLoading;

  const handleUseCoupon = (mysteryBoxId?: string) => {
    if (mysteryBoxId && onOpenBox) {
      onOpenBox(mysteryBoxId);
      return;
    }
    onGoMall?.();
  };

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("coupons.title")} onBack={onBack} />
      <SubPageShelfAccent />
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void refetch()} /> : null}
      {shouldShowListSkeleton(isLoading, items.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={5} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refetch()} tintColor={colors.brand} />
          }
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={token ? t("coupons.emptyTitle") : t("coupons.guestEmptyTitle")}
              description={token ? t("coupons.emptyDesc") : t("coupons.guestEmptyDesc")}
              actionLabel={
                !token && onRequireLogin
                  ? t("coupons.goLogin")
                  : onGoWelfare
                    ? t("coupons.goWelfare")
                    : undefined
              }
              onAction={!token && onRequireLogin ? onRequireLogin : onGoWelfare}
            />,
          )}
          renderItem={({ item }) => {
            const amount = item.amount ?? item.coupon?.amount;
            const name = item.name || item.coupon?.name || t("coupons.fallbackName");
            const status = item.status || t("coupons.statusAvailable");
            const expiring = isCouponExpiringSoon(item);
            const daysLeft = daysUntilCouponExpiry(item);
            const mysteryBoxId = item.mysteryBoxId ?? item.coupon?.mysteryBoxId;
            const canUse = Boolean(onGoMall || onOpenBox);
            return (
              <View
                style={[styles.row, expiring ? styles.rowExpiring : null]}
                accessibilityLabel={t("coupons.a11y", { name, status })}
              >
                <View style={[styles.amountCol, expiring ? styles.amountColExpiring : null]}>
                  <Text style={styles.amount}>{amount != null ? formatCurrency(amount) : t("coupons.amountFallback")}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.meta}>{status}</Text>
                  {expiring && daysLeft != null ? (
                    <Text style={styles.expireBadge}>{t("coupons.expiringSoon", { days: daysLeft })}</Text>
                  ) : null}
                  {canUse ? (
                    <Pressable
                      style={styles.useBtn}
                      onPress={() => handleUseCoupon(mysteryBoxId)}
                      accessibilityRole="button"
                      accessibilityLabel={t("coupons.useNowA11y")}
                    >
                      <Text style={styles.useBtnText}>{t("coupons.useNow")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function buildCouponsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    list: {
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: spacing.sm,
      paddingBottom: layout.screenPaddingBottom,
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row",
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
      ...shadows.cardSm,
    },
    amountCol: {
      width: 96,
      backgroundColor: colors.bgBrandSoft,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.lg,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    amount: { fontSize: typography.h3, fontWeight: "900", color: colors.brand },
    metaCol: { flex: 1, padding: spacing.lg, justifyContent: "center", gap: 4 },
    name: { fontSize: typography.body, fontWeight: "800", color: colors.textPrimary },
    meta: { fontSize: typography.caption, color: colors.textSecondary },
    rowExpiring: { borderColor: colors.warning },
    amountColExpiring: { backgroundColor: colors.warningSoft },
    expireBadge: { fontSize: typography.micro, color: colors.warning, fontWeight: "800" },
    useBtn: {
      alignSelf: "flex-start",
      marginTop: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
    },
    useBtnText: { fontSize: typography.micro, fontWeight: "800", color: colors.textOnBrand },
  });
}
