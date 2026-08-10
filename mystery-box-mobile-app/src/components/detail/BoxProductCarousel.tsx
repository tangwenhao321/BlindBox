import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { OptimizedFlatList } from "../ui/OptimizedFlatList";
import { QualityBadge } from "../ui/QualityBadge";
import { RemoteImage } from "../ui/RemoteImage";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBox, Product } from "../../types";
import { uniqueProducts } from "../../utils/boxDisplay";
import { resolveBoxImageUrl, resolveProductImageUrl } from "../../utils/boxImage";
import { formatCurrency } from "../../utils/formatCurrency";

const { width: SCREEN_W } = Dimensions.get("window");
const CAROUSEL_W = SCREEN_W - layout.screenPaddingX * 2;

type Props = {
  activeBox: MysteryBox;
  items: Product[];
  onIndexChange?: (index: number) => void;
};

export function BoxProductCarousel({ activeBox, items, onIndexChange }: Props) {
  const styles = useThemedStyles(buildBoxProductCarouselStyles);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const slides = uniqueProducts(items);

  const setIndex = (idx: number) => {
    setCarouselIndex(idx);
    onIndexChange?.(idx);
  };

  useEffect(() => {
    const neighbors = [carouselIndex - 1, carouselIndex + 1];
    neighbors.forEach((idx) => {
      const item = slides[idx];
      if (!item) return;
      const uri = resolveProductImageUrl(item.id, item.name) || resolveBoxImageUrl(activeBox);
      if (uri) void Image.prefetch(uri);
    });
  }, [activeBox, carouselIndex, slides]);

  return (
    <View style={styles.carouselWrap}>
      <OptimizedFlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id || item.name}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_W);
          setIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={styles.carouselSlide}>
            <RemoteImage
              uri={resolveProductImageUrl(item.id, item.name) || resolveBoxImageUrl(activeBox)}
              style={styles.carouselImage}
            />
            <View style={styles.carouselBadge}>
              <QualityBadge tier={item.qualityType || "LEGEND"} compact />
            </View>
            <View style={styles.carouselCaption}>
              <Text style={styles.carouselName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.carouselPrice}>{formatCurrency(item.price ?? activeBox.price)}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.dots}>
        {slides.map((item, idx) => (
          <View
            key={item.id ? `${item.id}-dot` : `dot-${idx}`}
            style={[styles.dot, idx === carouselIndex ? styles.dotActive : null]}
          />
        ))}
      </View>
    </View>
  );
}

function buildBoxProductCarouselStyles(colors: ThemeColors) {
  return StyleSheet.create({
    carouselWrap: { marginBottom: spacing.lg },
    carouselSlide: {
      width: CAROUSEL_W,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    carouselImage: { width: "100%", height: 220 },
    carouselBadge: { position: "absolute", top: spacing.sm, start: spacing.sm },
    carouselCaption: {
      position: "absolute",
      start: spacing.md,
      end: spacing.md,
      bottom: spacing.md,
      backgroundColor: "rgba(0,0,0,0.45)",
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    carouselName: { color: "#fff", fontWeight: "800", fontSize: typography.body },
    carouselPrice: { color: "#fff", fontWeight: "800", marginTop: 4, fontSize: typography.h4 },
    dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { width: 18, backgroundColor: colors.brand },
  });
}
