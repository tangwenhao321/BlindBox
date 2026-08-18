import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CommissionDetailsView } from "./CommissionDetailsView";
import { PromotionView } from "./PromotionView";
import { TeamView } from "./TeamView";
import { SubPageHeader } from "./ui/SubPageHeader";
import { SubPageShelfAccent } from "./ui/SubPageShelfAccent";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { useAuthToken } from "../hooks/useAuthToken";
import { useReferralStats } from "../hooks/useReferralStats";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Tab = "promotion" | "team" | "commission";

type Props = {
  initialTab?: Tab;
  onBack: () => void;
  onRequireLogin?: () => void;
  onOpenTeamLottery?: () => void;
};

const TABS: { key: Tab; labelKey: string }[] = [
  { key: "promotion", labelKey: "invite.tabPromotion" },
  { key: "team", labelKey: "invite.tabTeam" },
  { key: "commission", labelKey: "invite.tabCommission" },
];

export function InviteCenterView({ initialTab = "promotion", onBack, onRequireLogin, onOpenTeamLottery }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const styles = useThemedStyles(buildInviteCenterViewStyles);
  const [tab, setTab] = useState<Tab>(initialTab);
  const referral = useReferralStats(token);
  const { loadError: statsError, refresh: refreshStats } = referral;

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("invite.title")} onBack={onBack} />
      <SubPageShelfAccent />
      {statsError ? (
        <ListErrorBanner message={statsError} onRetry={() => void refreshStats()} />
      ) : null}
      <View style={styles.tabs}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.tab, active ? styles.tabOn : null]}
              onPress={() => setTab(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(item.labelKey)}
            >
              <Text style={[styles.tabText, active ? styles.tabTextOn : null]}>{t(item.labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.body}>
        {tab === "promotion" ? (
          <PromotionView onBack={onBack} embedded referral={referral} onRequireLogin={onRequireLogin} />
        ) : null}
        {tab === "team" ? (
          <TeamView
            onBack={onBack}
            embedded
            referral={referral}
            onRequireLogin={onRequireLogin}
            onOpenTeamLottery={onOpenTeamLottery}
          />
        ) : null}
        {tab === "commission" ? (
          <CommissionDetailsView onBack={onBack} embedded onRequireLogin={onRequireLogin} />
        ) : null}
      </View>
    </View>
  );
}

function buildInviteCenterViewStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    tabs: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    tabText: { fontWeight: "700", color: colors.textSecondary, fontSize: typography.caption },
    tabTextOn: { color: colors.textOnBrand },
    body: { flex: 1 },
  });
}
