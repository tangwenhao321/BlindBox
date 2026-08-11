import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { RemoteImage } from "../ui/RemoteImage";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBox } from "../../types";
import { resolveBoxImageUrl } from "../../utils/boxImage";
import { formatCurrency } from "../../utils/formatCurrency";
import { trackEvent } from "../../utils/analytics";
import { setVariant as setRecommendVariant } from "../../utils/lastRecommendAttribution";

type Props = {
  boxes: MysteryBox[];
  onOpenBox: (id: string) => void;
  /** A/B variant from recommendation API — include in RECOMMEND_IMPRESSION. */
  variant?: string;
};

export function RecommendCarousel({ boxes, onOpenBox, variant }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildRecommendCarouselStyles);
  const impressedRef = useRef(false);

  useEffect(() => {
    const uris = boxes.slice(0, 3).map((item) => resolveBoxImageUrl(item)).filter(Boolean);
    uris.forEach((uri) => {
      void Image.prefetch(uri);
    });
  }, [boxes]);

  if (!boxes.length) return null;

  return (
    <View
      style={styles.wrap}
      onLayout={() => {
        if (impressedRef.current) return;
        impressedRef.current = true;
        trackEvent("recommend_impression", { count: boxes.length, variant });
      }}
    >
      <Text style={styles.title}>{t("home.recommendTitle")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {boxes.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={t("mall.boxA11y", { name: item.name, price: formatCurrency(item.price) })}
            style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            onPress={() => {
              setRecommendVariant(item.id, variant);
              trackEvent("recommend_click", { boxId: item.id, boxName: item.name, variant });
              onOpenBox(item.id);
            }}
          >
            <RemoteImage uri={resolveBoxImageUrl(item)} style={styles.image} priority="low" />
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.price}>{formatCurrency(item.price)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function buildRecommendCarouselStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.md, gap: spacing.sm },
    title: {
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.textSecondary,
      paddingHorizontal: spacing.lg,
    },
    row: { paddingHorizontal: spacing.lg, gap: spacing.md },
    card: {
      width: 132,
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    image: { width: "100%", height: 96, borderRadius: radius.sm, marginBottom: spacing.xs },
    name: { fontSize: typography.caption, fontWeight: "700", color: colors.textPrimary },
    price: { marginTop: 2, fontSize: typography.micro, fontWeight: "800", color: colors.brand },
    pressed: { opacity: 0.92 },
  });
}
