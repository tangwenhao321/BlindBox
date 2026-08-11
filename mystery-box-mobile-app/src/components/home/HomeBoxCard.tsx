import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedRevealCard } from "../AnimatedRevealCard";
import { RemoteImage } from "../ui/RemoteImage";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, radius, shelfLipMetrics, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBox } from "../../types";
import { resolveBoxImageUrl, resolveProductImageUrl } from "../../utils/boxImage";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getBoxValueRange,
  getPoolRemainingLabel,
  getPromoTag,
  listItemKey,
  uniqueProducts,
} from "../../utils/boxDisplay";

type Props = {
  item: MysteryBox;
  index: number;
  packTeaser?: string | null;
  onPress: (id: string) => void;
};

function HomeBoxCardInner({ item, index, packTeaser, onPress }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBoxCardStyles);
  const range = getBoxValueRange(item);
  const poolLabel = getPoolRemainingLabel(item);
  const prizes = uniqueProducts(item.products ?? [], 4);

  return (
    <AnimatedRevealCard delay={Math.min(index * 50, 250)}>
      <Pressable
        testID={`boxCard-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={t("home.boxA11y", { name: item.name, price: formatCurrency(item.price) })}
        onPress={() => onPress(item.id)}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.coverWrap}>
          <RemoteImage uri={resolveBoxImageUrl(item)} style={styles.cover} priority="high" />
          {item.newcomerExclusive ? (
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>{t("home.boxNewcomer")}</Text>
            </View>
          ) : null}
          <View style={styles.shelfLip} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.promoText} numberOfLines={1}>
            {getPromoTag(item)}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(item.price)}</Text>
            {poolLabel ? <Text style={styles.sales}>{poolLabel}</Text> : null}
          </View>
          {packTeaser ? <Text style={styles.packTeaser}>{packTeaser}</Text> : null}
          <Text style={styles.valueText}>
            {t("home.boxValueRange", { min: formatCurrency(range.min), max: formatCurrency(range.max) })}
          </Text>
          {prizes.length ? (
            <View style={styles.prizeRow}>
              <View style={styles.prizeThumbs}>
                {prizes.map((p, i) => (
                  <RemoteImage
                    key={listItemKey(p.id, i, "prize")}
                    uri={resolveProductImageUrl(p.id, p.name)}
                    style={styles.prizeThumb}
                    priority="low"
                  />
                ))}
              </View>
              <View style={styles.openCta}>
                <Text style={styles.openHint}>{t("home.boxOpenNow")}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.openCtaSolo}>
              <Text style={styles.openHint}>{t("home.boxOpenNow")}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </AnimatedRevealCard>
  );
}

export const HomeBoxCard = memo(HomeBoxCardInner);

function buildBoxCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgSoft,
      borderRadius: radius.md,
      marginBottom: spacing.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { opacity: 0.9 },
    coverWrap: {
      width: "100%",
      height: 196,
      backgroundColor: colors.bgMuted,
      position: "relative",
    },
    cover: { width: "100%", height: "100%" },
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
    newTag: {
      position: "absolute",
      top: spacing.sm,
      left: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: radius.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    newTagText: {
      ...font("bodySemiBold"),
      color: colors.textOnBrand,
      fontSize: typography.micro,
      fontWeight: "800",
    },
    info: { padding: spacing.md, gap: spacing.xs },
    title: {
      ...font("bodySemiBold"),
      fontSize: typography.h4,
      fontWeight: "800",
      color: colors.textPrimary,
      lineHeight: 24,
    },
    promoText: {
      ...font("body"),
      color: colors.brandText,
      fontSize: typography.micro,
      fontWeight: "700",
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginTop: spacing.xs,
    },
    packTeaser: {
      ...font("bodyMedium"),
      fontSize: typography.micro,
      color: colors.successText,
      fontWeight: "700",
      marginTop: 2,
    },
    price: {
      ...font("numeral"),
      fontSize: typography.h3,
      fontWeight: "800",
      color: colors.brandText,
    },
    sales: {
      ...font("body"),
      fontSize: typography.micro,
      color: colors.textMuted,
      fontWeight: "600",
    },
    valueText: {
      ...font("body"),
      fontSize: typography.micro,
      color: colors.textMuted,
      fontWeight: "600",
      marginTop: 2,
    },
    prizeRow: {
      marginTop: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    prizeThumbs: { flex: 1, flexDirection: "row", gap: 6 },
    prizeThumb: {
      width: 40,
      height: 40,
      borderRadius: radius.xs,
      backgroundColor: colors.bgMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    openCta: {
      backgroundColor: colors.brand,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    openCtaSolo: {
      alignSelf: "flex-start",
      marginTop: spacing.sm,
      backgroundColor: colors.brand,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    openHint: {
      ...font("bodySemiBold"),
      color: colors.textOnBrand,
      fontWeight: "800",
      fontSize: typography.caption,
    },
  });
}
