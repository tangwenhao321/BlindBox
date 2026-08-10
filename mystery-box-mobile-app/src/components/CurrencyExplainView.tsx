import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getCheckInStatus } from "../services/welfareService";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { useLuckyCoinLedger } from "../hooks/useLuckyCoinLedger";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  kind: "luckyCoins" | "starStones";
  fallbackAmount?: number;
  onBack: () => void;
  onGoWelfare?: () => void;
};

export function CurrencyExplainView({ kind, fallbackAmount = 0, onBack, onGoWelfare }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const styles = useThemedStyles(buildCurrencyStyles);
  const title = kind === "luckyCoins" ? t("profile.luckyCoins") : t("profile.starStones");
  const desc = kind === "luckyCoins" ? t("currency.luckyCoinsDesc") : t("currency.starStonesDesc");
  const action = kind === "luckyCoins" ? t("currency.goCheckIn") : t("currency.goWelfare");
  const [amount, setAmount] = useState(fallbackAmount);
  const [loaded, setLoaded] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();

  const reload = useCallback(async () => {
    await runLoad(async () => {
      const status = await getCheckInStatus(token);
      setAmount(kind === "luckyCoins" ? status.luckyCoins : status.starStones);
      setLoaded(true);
    });
  }, [token, kind, runLoad]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const showSkeleton = shouldShowListSkeleton(loading, loaded ? 1 : 0, loadError);
  const ledger = useLuckyCoinLedger(kind === "luckyCoins" ? token : "");
  const showLedger = kind === "luckyCoins" && ledger.entries.length > 0;

  return (
    <View style={styles.root}>
      <SubPageHeader title={title} onBack={onBack} />
      <ScreenScaffold contentContainerStyle={styles.content}>
        {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
        {showSkeleton ? (
          <ListSkeleton variant="row" rows={2} />
        ) : (
          <>
            <Text style={styles.amount}>{amount}</Text>
            <Text style={styles.label}>{t("currency.currentLabel", { name: title })}</Text>
          </>
        )}
        <Text style={styles.desc}>{desc}</Text>
        {showLedger ? (
          <View style={styles.ledgerBlock}>
            <Text style={styles.ledgerTitle}>{t("currency.ledgerTitle")}</Text>
            {ledger.entries.map((entry) => (
              <View key={entry.id} style={styles.ledgerRow}>
                <Text style={styles.ledgerRemark}>{entry.remark || "—"}</Text>
                <Text style={styles.ledgerAmount}>{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {onGoWelfare && !showSkeleton ? (
          <Pressable
            style={styles.btn}
            onPress={onGoWelfare}
            accessibilityRole="button"
            accessibilityLabel={action}
          >
            <Text style={styles.btnText}>{action}</Text>
          </Pressable>
        ) : null}
      </ScreenScaffold>
    </View>
  );
}

function buildCurrencyStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    content: { padding: spacing.xl, alignItems: "center", paddingBottom: layout.screenPaddingBottom },
    amount: { fontSize: 48, fontWeight: "900", color: colors.brand },
    label: { marginTop: spacing.sm, fontSize: typography.body, color: colors.textSecondary },
    desc: {
      marginTop: spacing.xl,
      fontSize: typography.body,
      color: colors.textPrimary,
      lineHeight: 24,
      textAlign: "center",
    },
    btn: {
      marginTop: spacing.xl,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    btnText: { color: colors.textOnBrand, fontWeight: "800" },
    ledgerBlock: {
      marginTop: spacing.xl,
      width: "100%",
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    ledgerTitle: { fontWeight: "800", color: colors.textPrimary, marginBottom: spacing.xs },
    ledgerRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
    ledgerRemark: { flex: 1, color: colors.textSecondary, fontSize: typography.caption },
    ledgerAmount: { fontWeight: "800", color: colors.brand },
  });
}
