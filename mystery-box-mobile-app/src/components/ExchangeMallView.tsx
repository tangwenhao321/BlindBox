import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { RemoteImage } from "./ui/RemoteImage";
import { resolveProductImageUrl } from "../utils/boxImage";
import { useTranslation } from "react-i18next";
import { ListSkeleton } from "./ListSkeleton";
import { SubPageHeader } from "./ui/SubPageHeader";
import { SubPageShelfAccent } from "./ui/SubPageShelfAccent";
import { EmptyState } from "./EmptyState";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import {
  exchangeFragmentSku,
  fetchFragmentProgress,
  type FragmentSku,
} from "../services/fragmentService";
import { toast } from "../utils/toast";
import { parseError } from "../utils/apiErrorMessage";
import { queueIfOffline } from "../utils/offlineSubmitGuard";

type Props = {
  onBack: () => void;
  onGoWarehouse?: () => void;
};

export function ExchangeMallView({ onBack, onGoWarehouse }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildExchangeMallStyles);
  const [balance, setBalance] = useState(0);
  const [skus, setSkus] = useState<FragmentSku[]>([]);
  const [affordableCount, setAffordableCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();

  const reload = useCallback(async () => {
    await runLoad(async () => {
      const progress = await fetchFragmentProgress(token);
      if (!progress) {
        setBalance(0);
        setSkus([]);
        setAffordableCount(0);
        return;
      }
      setBalance(progress.balance);
      setAffordableCount(progress.affordableCount);
      setSkus(
        progress.skus
          .filter((s) => s.id !== "sku-default-1" && !s.name.includes("进阶兑换示例"))
          .map((s) => ({
            id: s.id,
            name: s.name,
            cover: s.cover,
            fragmentCost: s.fragmentCost,
            stockRemaining: s.stockRemaining,
          })),
      );
    });
  }, [token, runLoad]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <View style={styles.page}>
      <SubPageHeader title={t("exchangeMall.titleAdvanced")} onBack={onBack} />
      <SubPageShelfAccent />
      <Text style={styles.balance}>
        {t("exchangeMall.balanceSummary", {
          balance,
          affordable: affordableCount,
          total: skus.length,
        })}
      </Text>
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {shouldShowListSkeleton(loading, skus.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={4} />
      ) : (
        <OptimizedFlatList
          listVariant="card"
          data={skus}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void reload().finally(() => setRefreshing(false));
              }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={t("exchangeMall.emptyTitle")}
              description={t("exchangeMall.emptyDesc")}
              variant="plain"
              actionLabel={onGoWarehouse ? t("exchangeMall.goWarehouse") : undefined}
              onAction={onGoWarehouse}
            />,
          )}
          renderItem={({ item: sku }) => (
            <View style={styles.card}>
              <RemoteImage
                uri={resolveProductImageUrl(sku.id, sku.name, sku.cover)}
                style={styles.cover}
                contentFit="cover"
              />
              <Text style={styles.name}>{sku.name}</Text>
              <Text style={styles.meta}>
                {t("exchangeMall.skuMeta", {
                  cost: sku.fragmentCost,
                  stock: sku.stockRemaining,
                  percent: Math.min(100, Math.round((balance / Math.max(sku.fragmentCost, 1)) * 100)),
                })}
              </Text>
              <Pressable
                style={styles.btn}
                accessibilityRole="button"
                accessibilityLabel={t("exchangeMall.exchangeA11y", { name: sku.name })}
                onPress={async () => {
                  const idempotencySeed = `${sku.id}:${Date.now()}`;
                  const perform = async () => {
                    await exchangeFragmentSku(token, sku.id, { idempotencySeed });
                    toast.success(t("exchangeMall.exchangeSuccess"));
                    await reload();
                  };
                  if (
                    queueIfOffline(t("offline.actionExchange"), perform, {
                      kind: "exchangeFragment",
                      token,
                      payload: { skuId: sku.id, idempotencySeed },
                    })
                  )
                    return;
                  try {
                    await perform();
                  } catch (error) {
                    toast.error(parseError(error));
                  }
                }}
              >
                <Text style={styles.btnText}>{t("exchangeMall.exchangeNow")}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function buildExchangeMallStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.bgPage },
    balance: {
      fontWeight: "900",
      fontSize: typography.h3,
      marginBottom: spacing.sm,
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: spacing.sm,
      color: colors.textPrimary,
    },
    content: { paddingHorizontal: layout.screenPaddingX, gap: spacing.md, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cover: {
      width: "100%",
      height: 120,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    name: { fontWeight: "800", fontSize: typography.bodyLg, color: colors.textPrimary },
    meta: { marginTop: 4, color: colors.textSecondary, fontSize: typography.caption },
    btn: {
      marginTop: spacing.sm,
      alignSelf: "flex-start",
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    btnText: { color: colors.textOnBrand, fontWeight: "800" },
  });
}
