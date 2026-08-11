import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedRevealCard } from "./AnimatedRevealCard";
import { RemoteImage } from "./ui/RemoteImage";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { MysteryBox } from "../types";
import { resolveBoxImageUrl } from "../utils/boxImage";
import { formatCurrency } from "../utils/formatCurrency";

type Props = {
  item: MysteryBox;
  index: number;
  onPress: (id: string) => void;
};

function BoxListCardInner({ item, index, onPress }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBoxListCardStyles);

  return (
    <AnimatedRevealCard delay={Math.min(index * 40, 220)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("boxList.a11y", { name: item.name, price: formatCurrency(item.price) })}
        style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
        onPress={() => onPress(item.id)}
      >
        <View style={styles.coverWrap}>
          <RemoteImage uri={resolveBoxImageUrl(item)} style={styles.cardImage} priority="low" />
          <View style={styles.shelfLip} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.row}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.pricePill}>
              <Text style={styles.priceTag}>{formatCurrency(item.price)}</Text>
            </View>
          </View>
          <Text style={styles.cardHint} numberOfLines={2}>
            {item.tips || t("boxList.defaultHint")}
          </Text>
          <Text style={styles.cardAction}>{t("boxList.openNow")}</Text>
        </View>
      </Pressable>
    </AnimatedRevealCard>
  );
}

export const BoxListCard = memo(BoxListCardInner);

function buildBoxListCardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      marginBottom: spacing.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    cardPressed: { opacity: 0.94 },
    coverWrap: {
      width: "100%",
      height: 168,
      backgroundColor: colors.bgMuted,
      position: "relative",
    },
    cardImage: { width: "100%", height: "100%" },
    shelfLip: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 10,
      backgroundColor: colors.shelfLip,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.brandDark,
    },
    cardBody: { padding: spacing.lg },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
    cardTitle: { flex: 1, fontWeight: "800", fontSize: typography.bodyLg, color: colors.textPrimary, marginRight: spacing.sm },
    pricePill: {
      backgroundColor: colors.bgBrandSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    priceTag: { color: colors.brandText, fontWeight: "800", fontSize: typography.caption },
    cardHint: { color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginBottom: spacing.sm },
    cardAction: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  });
}
