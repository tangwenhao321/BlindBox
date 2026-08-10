import { useMemo, useRef, useState, useEffect } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { RemoteImage } from "../ui/RemoteImage";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { qualityAccentColor } from "../../utils/quality";

type Slide = { uri?: string; title: string; subtitle: string; cta?: string };
type TickerItem = { text: string; qualityType?: string | null };

type Props = {
  slides: Slide[];
  tickerText?: string;
  tickerLines?: string[];
  tickerItems?: TickerItem[];
  onPressSlide?: (index: number) => void;
  onPressTicker?: () => void;
};

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W - spacing.lg * 2;

export function HomeBannerCarousel({ slides, tickerText, tickerLines, tickerItems, onPressSlide, onPressTicker }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildHomeBannerCarouselStyles);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);
  const data = useMemo(
    () =>
      slides.length
        ? slides
        : [{ title: t("home.bannerPlayGuide"), subtitle: t("home.bannerPlayGuideSub") }],
    [slides, t],
  );
  const items: TickerItem[] =
    tickerItems?.length
      ? tickerItems
      : (tickerLines?.length ? tickerLines.map((text) => ({ text })) : tickerText ? [{ text: tickerText }] : []);
  const activeTicker = items.length ? items[tickerIndex % items.length] : undefined;

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setTickerIndex((i) => (i + 1) % items.length), 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + spacing.sm));
    if (next !== index) setIndex(next);
  };

  return (
    <View style={styles.wrap}>
      {activeTicker ? (
        <Pressable
          style={styles.ticker}
          onPress={onPressTicker}
          disabled={!onPressTicker}
          accessibilityRole="button"
          accessibilityLabel={activeTicker.text}
        >
          <Text style={styles.tickerTag}>{t("home.tickerGoodNews")}</Text>
          {activeTicker.qualityType ? (
            <View
              style={[
                styles.qualityDot,
                { backgroundColor: qualityAccentColor(activeTicker.qualityType) },
              ]}
            />
          ) : null}
          <Text style={styles.tickerText} numberOfLines={1}>
            {activeTicker.text}
          </Text>
          {items.length > 1 ? <Text style={styles.tickerMore}>›</Text> : null}
        </Pressable>
      ) : null}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_W + spacing.sm}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {data.map((slide, i) => (
          <Pressable
            key={`${slide.title}-${i}`}
            onPress={() => onPressSlide?.(i)}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={slide.title}
          >
            <AppGradient colors={["#1A1035", "#312E81", "#4338CA"]} style={styles.cardGradient}>
              {slide.uri ? (
                <RemoteImage uri={slide.uri} style={styles.cardImage} />
              ) : null}
              <View style={styles.cardOverlay} />
              <View style={styles.cardBody}>
                <Text style={styles.cardBadge}>{t("home.bannerPlayGuide")}</Text>
                <Text style={styles.cardTitle}>{slide.title}</Text>
                <Text style={styles.cardSub}>{slide.subtitle}</Text>
                {slide.cta ? (
                  <Text style={[styles.cardCta, { color: colors.accentOrange }]}>{slide.cta} →</Text>
                ) : null}
              </View>
            </AppGradient>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
        ))}
      </View>
    </View>
  );
}

function buildHomeBannerCarouselStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.lg, gap: spacing.sm },
    ticker: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: "rgba(26,16,53,0.92)",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    tickerTag: {
      color: colors.accentOrange,
      fontSize: typography.micro,
      fontWeight: "900",
      backgroundColor: "rgba(255,138,61,0.15)",
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    tickerText: { flex: 1, color: colors.textOnBrand, fontSize: typography.caption, fontWeight: "600" },
    tickerMore: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.body },
    qualityDot: { width: 8, height: 8, borderRadius: 4 },
    scrollContent: { gap: spacing.sm, paddingRight: spacing.lg },
    card: { width: CARD_W, borderRadius: radius.lg, overflow: "hidden", ...shadows.card },
    cardGradient: { minHeight: 168, justifyContent: "flex-end" },
    cardImage: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
    cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(26,16,53,0.35)" },
    cardBody: { padding: spacing.lg, gap: spacing.xs },
    cardBadge: {
      alignSelf: "flex-start",
      color: colors.textOnBrand,
      fontSize: typography.micro,
      fontWeight: "800",
      backgroundColor: "rgba(255,255,255,0.18)",
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: "hidden",
    },
    cardTitle: { color: colors.textOnBrand, fontSize: typography.h3, fontWeight: "900" },
    cardSub: { color: "rgba(255,255,255,0.82)", fontSize: typography.caption, fontWeight: "600" },
    cardCta: { marginTop: spacing.xs, fontWeight: "800", fontSize: typography.caption },
    dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderSoft },
    dotActive: { width: 18, backgroundColor: colors.brand },
  });
}
