import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import type { CeremonyTier } from "../../effects/ceremonyTier";
import { getRevealRemoteConfig } from "../../effects/revealRemote";
import { resolveRevealTheme } from "../../effects/revealTheme";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { Product } from "../../types";
import type { PurchaseLimitStatus } from "../../services/purchaseLimitService";
import { formatCurrency, formatCurrencyDiscount } from "../../utils/formatCurrency";
import { LustrePillButton } from "../ui/LustrePillButton";
import type { RefObject } from "react";

type Props = {
  displayPayAmount: number;
  drawCount: number;
  products: Product[];
  boxName: string;
  boxId?: string;
  boxCategoryName?: string;
  batchDiscount: number;
  packProgressHint: string | null;
  packTeaser: string | null;
  purchaseLimit: PurchaseLimitStatus | null;
  buyoutBlocked: boolean;
  ctaPulse: SharedValue<number>;
  openBtnRef: RefObject<View | null>;
  isLoggedIn: boolean;
  onRequireLogin?: () => void;
  onOpenDrawModal: () => void;
};

function boxLustreTier(products: Product[]): CeremonyTier | null {
  const hasLegend = products.some((p) => {
    const q = (p.qualityType ?? "").toUpperCase();
    return q === "LEGENDARY" || q === "LEGEND";
  });
  if (hasLegend) return "TREASURE_LEGEND";
  const hasHidden = products.some((p) => {
    const q = (p.qualityType ?? "").toUpperCase();
    return q === "HIDDEN" || q === "EPIC";
  });
  if (hasHidden) return "HIDDEN";
  return null;
}

export function BoxDetailsBottomBar(props: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const {
    displayPayAmount,
    drawCount,
    products,
    boxName,
    boxId,
    boxCategoryName,
    batchDiscount,
    packProgressHint,
    packTeaser,
    purchaseLimit,
    buyoutBlocked,
    ctaPulse,
    openBtnRef,
    isLoggedIn,
    onRequireLogin,
    onOpenDrawModal,
  } = props;

  const revealTheme = useMemo(
    () =>
      resolveRevealTheme({
        boxName,
        categoryName: boxCategoryName,
        remoteThemeId: getRevealRemoteConfig().themeId,
      }),
    [boxName, boxCategoryName],
  );
  const lustreTier = useMemo(() => boxLustreTier(products), [products]);

  const styles = useThemedStyles((colors) => ({
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.bgCard,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    bottomMeta: { flex: 1, marginEnd: spacing.sm, gap: 2 },
    bottomPrice: { color: colors.brandText, fontSize: typography.h3, fontWeight: "900" },
    bottomHint: { color: colors.textMuted, fontSize: typography.micro },
    bottomSave: { color: colors.success, fontSize: typography.micro, fontWeight: "700" },
    openBtn: {
      backgroundColor: colors.brand,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
      minWidth: 140,
      alignItems: "center",
    },
    openBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.bodyLg },
    openBtnDisabled: { opacity: 0.45 },
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ctaPulse.value, [0, 1], [0.97, 1]) }],
  }));

  const openLabel = t("boxDetails.openBox");
  const openA11y = t("boxDetails.openBoxA11y", {
    count: drawCount,
    amount: formatCurrency(displayPayAmount),
  });
  const onOpen = () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    onOpenDrawModal();
  };

  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomMeta}>
        <Text style={styles.bottomPrice}>{formatCurrency(displayPayAmount)}</Text>
        <Text style={styles.bottomHint}>
          {t("boxDetails.drawCountHint", {
            count: drawCount,
            name: products[0]?.name ?? boxName,
          })}
        </Text>
        {batchDiscount > 0.01 ? (
          <Text style={styles.bottomSave}>
            {t("boxDetails.batchDiscount", { amount: formatCurrencyDiscount(batchDiscount) })}
          </Text>
        ) : packProgressHint ? (
          <Text style={styles.bottomSave}>{packProgressHint}</Text>
        ) : packTeaser ? (
          <Text style={styles.bottomSave}>{packTeaser}</Text>
        ) : null}
        {purchaseLimit && purchaseLimit.maxPerDay > 0 ? (
          <Text style={styles.bottomSave}>
            {t("boxDetails.dailyLimit", {
              remaining: purchaseLimit.remainingToday,
              max: purchaseLimit.maxPerDay,
            })}
          </Text>
        ) : null}
      </View>
      <Animated.View style={ctaStyle} ref={openBtnRef} collapsable={false}>
        {lustreTier ? (
          <LustrePillButton
            tier={lustreTier}
            boxId={boxId}
            revealTheme={revealTheme}
            innerBackground={themeColors.brand}
            disabled={buyoutBlocked}
            onPress={onOpen}
            testID="openBoxButton"
            accessibilityLabel={openA11y}
          >
            <Text style={styles.openBtnText}>{openLabel}</Text>
          </LustrePillButton>
        ) : (
          <Pressable
            testID="openBoxButton"
            accessibilityRole="button"
            accessibilityLabel={openA11y}
            style={[styles.openBtn, buyoutBlocked ? styles.openBtnDisabled : null]}
            disabled={buyoutBlocked}
            onPress={onOpen}
          >
            <Text style={styles.openBtnText}>{openLabel}</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}
