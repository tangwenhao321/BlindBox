import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedRevealCard } from "../AnimatedRevealCard";
import { RemoteImage } from "../ui/RemoteImage";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, radius, shelfLipMetrics, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBox } from "../../types";
import { resolveBoxImageUrl } from "../../utils/boxImage";
import { formatCurrency } from "../../utils/formatCurrency";
import { getPoolRemainingLabel, getPromoTag } from "../../utils/boxDisplay";

type Props = {
  item: MysteryBox;
  index: number;
  onPress: (id: string) => void;
};

function MallProductCardInner({ item, index, onPress }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildMallProductCardStyles);
  const poolLabel = getPoolRemainingLabel(item);
  const promo = getPromoTag(item);

  return (
    <AnimatedRevealCard delay={Math.min(index * 35, 200)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("mall.boxA11y", { name: item.name, price: formatCurrency(item.price) })}
        onPress={() => onPress(item.id)}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.imageWrap}>
          <RemoteImage uri={resolveBoxImageUrl(item)} style={styles.image} priority="low" />
          {item.newcomerExclusive ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t("mall.boxNewcomer")}</Text>
            </View>
          ) : null}
          <View style={styles.shelfLip} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.promo} numberOfLines={1}>
            {promo}
          </Text>
          <Text style={styles.price}>{formatCurrency(item.price)}</Text>
          {poolLabel ? <Text style={styles.pool}>{poolLabel}</Text> : null}
        </View>
      </Pressable>
    </AnimatedRevealCard>
  );
}

export const MallProductCard = memo(MallProductCardInner);

function buildMallProductCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.bgSoft,
      borderRadius: radius.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { opacity: 0.9 },
    imageWrap: {
      aspectRatio: 1,
      backgroundColor: colors.bgMuted,
      position: "relative",
    },
    image: { width: "100%", height: "100%" },
    shelfLip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: shelfLipMetrics.height,
      backgroundColor: colors.shelfLip,
      borderTopWidth: shelfLipMetrics.borderTopWidth,
      borderTopColor: colors.brandDark,
    },
    badge: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    badgeText: { color: colors.textOnBrand, fontSize: typography.micro, fontWeight: "900" },
    body: { padding: spacing.md, gap: 4, paddingBottom: spacing.md + 2 },
    title: {
      ...font("bodySemiBold"),
      fontSize: typography.caption,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    promo: { ...font("body"), fontSize: typography.micro, color: colors.textSecondary, marginTop: 2 },
    price: {
      ...font("numeral"),
      fontSize: typography.bodyLg,
      fontWeight: "900",
      color: colors.brandText,
      marginTop: spacing.xs,
    },
    pool: { ...font("bodySemiBold"), fontSize: typography.micro, color: colors.brand },
  });
}
