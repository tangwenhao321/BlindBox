import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { InlineSectionError } from "../ui/InlineSectionError";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { formatCurrency } from "../../utils/formatCurrency";
import type { ShipRequestSummary } from "../../services/warehouseShipService";

type Props = {
  authToken?: string;
  fragmentBalance: number | null;
  fragmentBalanceError: string | null;
  onReloadFragmentBalance: () => void;
  shipRequests: ShipRequestSummary[];
  onGoMarketplace?: () => void;
  onOpenExchangeMall?: () => void;
  onOpenShipRequests?: () => void;
};

export function WarehouseBannersSection({
  authToken,
  fragmentBalance,
  fragmentBalanceError,
  onReloadFragmentBalance,
  shipRequests,
  onGoMarketplace,
  onOpenExchangeMall,
  onOpenShipRequests,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBannerStyles);

  const shipRequestStatusLabel = (status: string) => {
    if (status === "PENDING") return t("warehouse.shipStatusPending");
    if (status === "SHIPPED") return t("warehouse.shipStatusShipped");
    return status;
  };

  return (
    <>
      {onGoMarketplace ? (
        <Pressable
          style={styles.marketBanner}
          onPress={onGoMarketplace}
          accessibilityRole="button"
          accessibilityLabel={t("warehouse.goMarketplaceA11y")}
        >
          <Text style={styles.marketBannerTitle}>{t("warehouse.marketplaceTitle")}</Text>
          <Text style={styles.marketBannerSub}>{t("warehouse.marketplaceSub")}</Text>
          <Text style={styles.marketBannerCta}>{t("warehouse.goMarketplace")}</Text>
        </Pressable>
      ) : null}
      {fragmentBalanceError ? (
        <InlineSectionError
          message={t("warehouse.fragmentLoadFailed", { message: fragmentBalanceError })}
          onRetry={onReloadFragmentBalance}
        />
      ) : null}
      {onOpenExchangeMall && authToken && fragmentBalance != null ? (
        <Pressable
          style={styles.fragmentBanner}
          onPress={onOpenExchangeMall}
          accessibilityRole="button"
          accessibilityLabel={t("warehouse.fragmentGoExchangeA11y")}
        >
          <Text style={styles.fragmentBannerTitle}>{t("warehouse.fragmentTitle")}</Text>
          <Text style={styles.fragmentBannerSub}>
            {t("warehouse.fragmentBalance", { count: fragmentBalance })}
          </Text>
          <Text style={styles.fragmentBannerCta}>{t("warehouse.fragmentGoExchange")}</Text>
        </Pressable>
      ) : null}
      {authToken && shipRequests.length > 0 ? (
        <View style={styles.shipRequestPanel}>
          <View style={styles.shipRequestHeader}>
            <Text style={styles.shipRequestTitle}>{t("warehouse.shipRequestTitle")}</Text>
            {onOpenShipRequests ? (
              <Pressable
                onPress={onOpenShipRequests}
                accessibilityRole="button"
                accessibilityLabel={t("warehouse.shipRequestAllA11y")}
              >
                <Text style={styles.shipRequestLink}>{t("warehouse.shipRequestAll")}</Text>
              </Pressable>
            ) : null}
          </View>
          {shipRequests.map((req) => (
            <View key={req.id} style={styles.shipRequestRow}>
              <Text style={styles.shipRequestMeta}>
                {t("warehouse.shipRequestMeta", {
                  count: req.itemCount,
                  fee: formatCurrency(Number(req.payAmount ?? 0)),
                  status: shipRequestStatusLabel(req.status),
                })}
              </Text>
              {req.trackingNumber ? (
                <Text style={styles.shipRequestTrack}>
                  {t("warehouse.shipRequestTrack", { number: req.trackingNumber })}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

function buildBannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    marketBanner: {
      marginHorizontal: layout.screenPaddingX,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.bgBrandSoft,
      borderWidth: 1,
      borderColor: colors.brand,
      gap: 4,
    },
    marketBannerTitle: { fontWeight: "900", fontSize: typography.bodyLg, color: colors.brandText },
    marketBannerSub: { color: colors.textSecondary, fontSize: typography.caption },
    marketBannerCta: { marginTop: spacing.xs, color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    fragmentBanner: {
      marginHorizontal: layout.screenPaddingX,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    fragmentBannerTitle: { fontWeight: "900", fontSize: typography.bodyLg, color: colors.textPrimary },
    fragmentBannerSub: { color: colors.textSecondary, fontSize: typography.caption },
    fragmentBannerCta: { marginTop: spacing.xs, color: colors.accent, fontWeight: "800", fontSize: typography.caption },
    shipRequestPanel: {
      marginHorizontal: layout.screenPaddingX,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.bgCard,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    shipRequestTitle: { fontWeight: "800", color: colors.textPrimary },
    shipRequestHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    shipRequestLink: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    shipRequestRow: { gap: 2 },
    shipRequestMeta: { fontSize: typography.caption, color: colors.textSecondary },
    shipRequestTrack: { fontSize: typography.caption, color: colors.brand, fontWeight: "700" },
  });
}
