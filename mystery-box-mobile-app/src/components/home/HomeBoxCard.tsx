import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedRevealCard } from "../AnimatedRevealCard";
import { RemoteImage } from "../ui/RemoteImage";
import { AppGradient } from "../ui/AppGradient";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
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
        <View style={styles.mainRow}>
          <View style={styles.coverWrap}>
            <RemoteImage uri={resolveBoxImageUrl(item)} style={styles.cover} priority="high" />
            {item.newcomerExclusive ? (
              <View style={styles.newTag}>
                <Text style={styles.newTagText}>{t("home.boxNewcomer")}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.promoTag}>
              <Text style={styles.promoText} numberOfLines={1}>
                {getPromoTag(item)}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatCurrency(item.price)}</Text>
              {poolLabel ? <Text style={styles.sales}>{poolLabel}</Text> : null}
            </View>
            {packTeaser ? <Text style={styles.packTeaser}>{packTeaser}</Text> : null}
            <AppGradient colors={["#FFF7ED", "#FFEDD5"]} style={styles.valueBadge}>
              <Text style={styles.valueText}>
                {t("home.boxValueRange", { min: formatCurrency(range.min), max: formatCurrency(range.max) })}
              </Text>
            </AppGradient>
          </View>
        </View>
        {prizes.length ? (
          <View style={styles.prizeRow}>
            <Text style={styles.prizeLabel}>{t("home.boxLegendPool")}</Text>
            <View style={styles.prizeThumbs}>
              {prizes.map((p, i) => (
                <RemoteImage
                  key={listItemKey(p.id, i, "prize")}
                  uri={resolveProductImageUrl(p.id, p.name)}
                  style={styles.prizeThumb}
                />
              ))}
            </View>
            <Text style={styles.openHint}>{t("home.boxOpenNow")}</Text>
          </View>
        ) : null}
      </Pressable>
    </AnimatedRevealCard>
  );
}

export const HomeBoxCard = memo(HomeBoxCardInner);

function buildBoxCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    pressed: { opacity: 0.96 },
    mainRow: { flexDirection: "row", gap: spacing.md },
    coverWrap: { width: 118, height: 118, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.bgSoft },
    cover: { width: "100%", height: "100%" },
    newTag: {
      position: "absolute",
      top: 6,
      left: 6,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    newTagText: { color: colors.textOnBrand, fontSize: typography.micro, fontWeight: "900" },
    info: { flex: 1, gap: spacing.xs },
    title: { fontSize: typography.bodyLg, fontWeight: "900", color: colors.textPrimary, lineHeight: 22 },
    promoTag: {
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      backgroundColor: colors.dangerSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    promoText: { color: colors.danger, fontSize: typography.micro, fontWeight: "700" },
    priceRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing.xs },
    packTeaser: { fontSize: typography.micro, color: colors.success, fontWeight: "700", marginTop: 2 },
    price: { fontSize: typography.h3, fontWeight: "900", color: colors.danger },
    sales: { fontSize: typography.micro, color: colors.textMuted, fontWeight: "600" },
    valueBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.xs },
    valueText: { fontSize: typography.micro, color: colors.accentOrange, fontWeight: "800" },
    prizeRow: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    prizeLabel: { fontSize: typography.micro, color: colors.textMuted, fontWeight: "700" },
    prizeThumbs: { flex: 1, flexDirection: "row", gap: 6 },
    prizeThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.bgSoft },
    openHint: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  });
}
