import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FEATURE_KEYS } from "../../config/featureRegistry";
import { formatCurrency } from "../../utils/formatCurrency";
import { AnimatedRevealCard } from "../AnimatedRevealCard";

type Props = {
  loggedIn: boolean;
  balanceAmount: number;
  luckyCoins: number;
  starStones: number;
  couponCount: number;
  refreshingBalance: boolean;
  balanceUpdatedAtText: string;
  checkedToday: boolean | null;
  checkInStreak: number;
  guard: (action: () => void) => void;
  onOpenBalanceLogs: () => void;
  onOpenFeature: (title: string) => void;
  styles: Record<string, object>;
};

export function ProfileWalletSection({
  loggedIn,
  balanceAmount,
  luckyCoins,
  starStones,
  couponCount,
  refreshingBalance,
  balanceUpdatedAtText,
  checkedToday,
  checkInStreak,
  guard,
  onOpenBalanceLogs,
  onOpenFeature,
  styles,
}: Props) {
  const { t } = useTranslation();
  return (
    <AnimatedRevealCard delay={40}>
      <View style={styles.walletRow}>
        <Pressable
          style={({ pressed }) => [styles.walletCell, pressed ? styles.pressablePressed : null]}
          onPress={() => guard(onOpenBalanceLogs)}
          accessibilityRole="button"
          accessibilityLabel={`${t("profile.balance")} ${formatCurrency(balanceAmount)}`}
        >
          <Text style={styles.walletValue}>{formatCurrency(balanceAmount)}</Text>
          <Text style={styles.walletLabel}>{t("profile.balance")}</Text>
        </Pressable>
        <View style={styles.walletDivider} />
        <Pressable
          style={({ pressed }) => [styles.walletCell, pressed ? styles.pressablePressed : null]}
          onPress={() => guard(() => onOpenFeature(FEATURE_KEYS.LUCKY_COINS))}
          accessibilityRole="button"
          accessibilityLabel={t("profile.luckyCoins")}
        >
          <Text style={styles.walletValue}>{luckyCoins}</Text>
          <Text style={styles.walletLabel}>{t("profile.luckyCoins")}</Text>
        </Pressable>
        <View style={styles.walletDivider} />
        <Pressable
          style={({ pressed }) => [styles.walletCell, pressed ? styles.pressablePressed : null]}
          onPress={() => guard(() => onOpenFeature(FEATURE_KEYS.STAR_STONES))}
          accessibilityRole="button"
          accessibilityLabel={t("profile.starStones")}
        >
          <Text style={styles.walletValue}>{starStones}</Text>
          <Text style={styles.walletLabel}>{t("profile.starStones")}</Text>
        </Pressable>
        <View style={styles.walletDivider} />
        <Pressable
          style={({ pressed }) => [styles.walletCell, pressed ? styles.pressablePressed : null]}
          onPress={() => guard(() => onOpenFeature(FEATURE_KEYS.COUPONS))}
          accessibilityRole="button"
          accessibilityLabel={t("profile.couponsCount", { count: couponCount })}
        >
          <Text style={styles.walletValue}>{couponCount}</Text>
          <Text style={styles.walletLabel}>{t("profile.appCoupons")}</Text>
        </Pressable>
      </View>
      {loggedIn ? (
        <Pressable
          onPress={() => guard(() => onOpenFeature(FEATURE_KEYS.CHECK_IN))}
          accessibilityRole="button"
          accessibilityLabel={t("profile.goCheckIn")}
        >
          <Text style={styles.balanceMetaLink}>
            {refreshingBalance ? t("profile.syncing") : balanceUpdatedAtText}
            {checkedToday != null
              ? checkedToday
                ? ` · ${t("profile.checkInToday")}`
                : ` · ${t("profile.goCheckIn")}`
              : null}
            {checkInStreak > 0 ? ` · ${t("profile.checkInStreak", { days: checkInStreak })}` : null}
          </Text>
        </Pressable>
      ) : null}
    </AnimatedRevealCard>
  );
}
