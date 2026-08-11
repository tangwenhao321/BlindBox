import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { OptimizedFlatList } from "../ui/OptimizedFlatList";
import { QualityBadge } from "../ui/QualityBadge";
import { RemoteImage } from "../ui/RemoteImage";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useAppTheme } from "../../context/ThemeContext";
import { font, layout, spacing, typography, withAlpha } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBox, Product } from "../../types";
import { uniqueProducts } from "../../utils/boxDisplay";
import { resolveBoxImageUrl, resolveProductImageUrl } from "../../utils/boxImage";
import { formatCurrency } from "../../utils/formatCurrency";

const { width: SCREEN_W } = Dimensions.get("window");
const STAGE_H = 328;

type Props = {
  activeBox: MysteryBox;
  items: Product[];
  onIndexChange?: (index: number) => void;
};

export function BoxProductCarousel({ activeBox, items, onIndexChange }: Props) {
  const styles = useThemedStyles(buildBoxProductCarouselStyles);
  const { colors } = useAppTheme();
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
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={styles.carouselSlide}>
            <RemoteImage
              uri={resolveProductImageUrl(item.id, item.name) || resolveBoxImageUrl(activeBox)}
              style={styles.carouselImage}
            />
            <LinearGradient
              colors={[
                "transparent",
                withAlpha(colors.bgPage, 0.35),
                withAlpha(colors.bgPage, 0.92),
              ]}
              locations={[0.35, 0.65, 1]}
              style={styles.vignette}
              pointerEvents="none"
            />
            <View style={styles.carouselBadge}>
              <QualityBadge tier={item.qualityType || "LEGEND"} compact />
            </View>
            <View style={styles.carouselCaption}>
              <Text style={styles.carouselName} numberOfLines={2}>
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
    carouselWrap: {
      marginHorizontal: -layout.screenPaddingX,
      marginBottom: spacing.lg,
      width: SCREEN_W,
    },
    carouselSlide: {
      width: SCREEN_W,
      overflow: "hidden",
      backgroundColor: colors.bgSoft,
    },
    carouselImage: { width: "100%", height: STAGE_H },
    vignette: {
      ...StyleSheet.absoluteFillObject,
      top: STAGE_H * 0.35,
    },
    carouselBadge: { position: "absolute", top: spacing.md, start: spacing.lg },
    carouselCaption: {
      position: "absolute",
      start: spacing.lg,
      end: spacing.lg,
      bottom: spacing.lg,
    },
    carouselName: {
      ...font("bodySemiBold"),
      color: colors.textPrimary,
      fontSize: typography.h2,
      letterSpacing: 0.4,
    },
    carouselPrice: {
      ...font("numeral"),
      color: colors.brandText,
      marginTop: 4,
      fontSize: typography.h4,
    },
    dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.sm },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotActive: { width: 18, backgroundColor: colors.brand },
  });
}
