import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { RemoteImage } from "../ui/RemoteImage";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { isHarmonyLikeDevice } from "../../effects/deviceProfile";
import { font, layout, radius, spacing, typography } from "../../styles/tokens";
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
const STAGE_H = 288;
const AUTOPLAY_MS = 4500;

function useBannerData(slides: Slide[], t: (key: string) => string) {
  return useMemo(
    () =>
      slides.length
        ? slides
        : [{ title: t("home.bannerPlayGuide"), subtitle: t("home.bannerPlayGuideSub") }],
    [slides, t],
  );
}

function useTickerItems(
  tickerItems: TickerItem[] | undefined,
  tickerLines: string[] | undefined,
  tickerText: string | undefined,
): TickerItem[] {
  return useMemo(
    () =>
      tickerItems?.length
        ? tickerItems
        : tickerLines?.length
          ? tickerLines.map((text) => ({ text }))
          : tickerText
            ? [{ text: tickerText }]
            : [],
    [tickerItems, tickerLines, tickerText],
  );
}

function BannerSlideContent({
  slide,
  colors,
  styles,
}: {
  slide: Slide;
  colors: ThemeColors;
  styles: ReturnType<typeof buildHomeBannerCarouselStyles>;
}) {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <AppGradient colors={[colors.bgSoft, colors.bgBrandSoft, colors.bgMuted]} style={styles.stageFill}>
        {slide.uri ? <RemoteImage uri={slide.uri} style={styles.stageImage} priority="high" /> : null}
        {/* Always dark bottom scrim so title/CTA sit clearly on the photo */}
        <AppGradient
          colors={["transparent", "rgba(20,17,15,0.35)", "rgba(20,17,15,0.82)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.stageScrim}
        />
        <View style={styles.stageBody} pointerEvents="none">
          <Text style={styles.stageTitle} numberOfLines={2}>
            {slide.title}
          </Text>
          {slide.subtitle ? <Text style={styles.stageSub}>{slide.subtitle}</Text> : null}
          {slide.cta ? (
            <View style={styles.stageCta}>
              <Text style={styles.stageCtaText}>{slide.cta}</Text>
            </View>
          ) : null}
        </View>
      </AppGradient>
    </View>
  );
}

function BannerSlideStatic({
  slide,
  colors,
  styles,
  onPress,
}: {
  slide: Slide;
  colors: ThemeColors;
  styles: ReturnType<typeof buildHomeBannerCarouselStyles>;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.stage}
      accessibilityRole="button"
      accessibilityLabel={slide.title}
    >
      <BannerSlideContent slide={slide} colors={colors} styles={styles} />
    </Pressable>
  );
}

function BannerSlideAnimated({
  slide,
  index,
  scrollX,
  reduceMotion,
  colors,
  styles,
  onPress,
}: {
  slide: Slide;
  index: number;
  scrollX: SharedValue<number>;
  reduceMotion: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof buildHomeBannerCarouselStyles>;
  onPress?: () => void;
}) {
  const parallaxStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W],
      [0.42, 1, 0.42],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.stage}
      accessibilityRole="button"
      accessibilityLabel={slide.title}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, reduceMotion ? null : parallaxStyle]}>
        <BannerSlideContent slide={slide} colors={colors} styles={styles} />
      </Animated.View>
    </Pressable>
  );
}

function BannerChrome({
  data,
  index,
  activeTicker,
  itemsCount,
  styles,
  t,
  onPressTicker,
}: {
  data: Slide[];
  index: number;
  activeTicker?: TickerItem;
  itemsCount: number;
  styles: ReturnType<typeof buildHomeBannerCarouselStyles>;
  t: (key: string) => string;
  onPressTicker?: () => void;
}) {
  return (
    <>
      <View style={styles.dots}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
        ))}
      </View>
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
              style={[styles.qualityDot, { backgroundColor: qualityAccentColor(activeTicker.qualityType) }]}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.tickerText} numberOfLines={1}>
              {activeTicker.text}
            </Text>
          </View>
          {itemsCount > 1 ? <Text style={styles.tickerMore}>›</Text> : null}
        </Pressable>
      ) : null}
    </>
  );
}

function useBannerAutoplay(
  length: number,
  enabled: boolean,
  scrollToIndex: (next: number) => void,
) {
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);

  const syncIndex = useCallback((next: number) => {
    indexRef.current = next;
    setIndex(next);
  }, []);

  useEffect(() => {
    if (!enabled || length <= 1) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % length;
      scrollToIndex(next);
      syncIndex(next);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [enabled, length, scrollToIndex, syncIndex]);

  return { index, syncIndex };
}

/** Classic ScrollView path for Honor/Harmony and reduce-motion (no Reanimated worklets). */
function HomeBannerCarouselClassic({
  slides,
  tickerText,
  tickerLines,
  tickerItems,
  onPressSlide,
  onPressTicker,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildHomeBannerCarouselStyles);
  const [tickerIndex, setTickerIndex] = useState(0);
  const data = useBannerData(slides, t);
  const items = useTickerItems(tickerItems, tickerLines, tickerText);
  const activeTicker = items.length ? items[tickerIndex % items.length] : undefined;
  const scrollRef = useRef<ScrollView>(null);

  const scrollToIndex = useCallback((next: number) => {
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
  }, []);

  const { index, syncIndex } = useBannerAutoplay(data.length, true, scrollToIndex);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setTickerIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (next !== index) syncIndex(next);
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {data.map((slide, i) => (
          <BannerSlideStatic
            key={`${slide.title}-${i}`}
            slide={slide}
            colors={colors}
            styles={styles}
            onPress={() => onPressSlide?.(i)}
          />
        ))}
      </ScrollView>
      <BannerChrome
        data={data}
        index={index}
        activeTicker={activeTicker}
        itemsCount={items.length}
        styles={styles}
        t={t}
        onPressTicker={onPressTicker}
      />
    </View>
  );
}

function HomeBannerCarouselReanimated({
  slides,
  tickerText,
  tickerLines,
  tickerItems,
  onPressSlide,
  onPressTicker,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildHomeBannerCarouselStyles);
  const reduceMotion = useReduceMotion();
  const [tickerIndex, setTickerIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const tickerOpacity = useSharedValue(1);
  const data = useBannerData(slides, t);
  const items = useTickerItems(tickerItems, tickerLines, tickerText);
  const activeTicker = items.length ? items[tickerIndex % items.length] : undefined;
  const advancingRef = useRef(false);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const scrollToIndex = useCallback((next: number) => {
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: !reduceMotion });
  }, [reduceMotion]);

  const { index, syncIndex } = useBannerAutoplay(data.length, true, scrollToIndex);

  const clearAdvancing = useCallback(() => {
    advancingRef.current = false;
  }, []);

  const bumpTicker = useCallback(() => {
    setTickerIndex((i) => (i + 1) % items.length);
    advancingRef.current = false;
    if (!reduceMotion) {
      tickerOpacity.value = withTiming(1, { duration: 220 });
    }
  }, [items.length, reduceMotion, tickerOpacity]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      if (reduceMotion) {
        setTickerIndex((i) => (i + 1) % items.length);
        return;
      }
      if (advancingRef.current) return;
      advancingRef.current = true;
      tickerOpacity.value = withTiming(0, { duration: 220 }, (finished) => {
        if (finished) runOnJS(bumpTicker)();
        else runOnJS(clearAdvancing)();
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length, reduceMotion, tickerOpacity, bumpTicker, clearAdvancing]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const onMomentumEnd = (x: number) => {
    const next = Math.round(x / SCREEN_W);
    if (next !== index) syncIndex(next);
  };

  const tickerFadeStyle = useAnimatedStyle(() => ({
    opacity: tickerOpacity.value,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => onMomentumEnd(e.nativeEvent.contentOffset.x)}
      >
        {data.map((slide, i) => (
          <BannerSlideAnimated
            key={`${slide.title}-${i}`}
            slide={slide}
            index={i}
            scrollX={scrollX}
            reduceMotion={reduceMotion}
            colors={colors}
            styles={styles}
            onPress={() => onPressSlide?.(i)}
          />
        ))}
      </Animated.ScrollView>
      <View style={styles.dots}>
        {data.map((_, i) => (
          <View key={i} style={[styles.dot, i === index ? styles.dotActive : null]} />
        ))}
      </View>
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
              style={[styles.qualityDot, { backgroundColor: qualityAccentColor(activeTicker.qualityType) }]}
            />
          ) : null}
          <Animated.View style={[{ flex: 1 }, reduceMotion ? null : tickerFadeStyle]}>
            <Text style={styles.tickerText} numberOfLines={1}>
              {activeTicker.text}
            </Text>
          </Animated.View>
          {items.length > 1 ? <Text style={styles.tickerMore}>›</Text> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeBannerCarousel(props: Props) {
  const reduceMotion = useReduceMotion();
  // Prefer classic ScrollView for test APKs and OEM/reduce-motion cases.
  // Reanimated carousel has caused first-paint ErrorBoundary crashes on several Android devices
  // (not limited to Harmony).
  const preferClassic =
    reduceMotion ||
    isHarmonyLikeDevice() ||
    process.env.EXPO_PUBLIC_APP_VARIANT === "test" ||
    Platform.OS === "android";
  if (preferClassic) {
    return <HomeBannerCarouselClassic {...props} />;
  }
  return <HomeBannerCarouselReanimated {...props} />;
}

function buildHomeBannerCarouselStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
      marginHorizontal: -layout.screenPaddingX,
      gap: spacing.sm,
    },
    stage: {
      width: SCREEN_W,
      height: STAGE_H,
      overflow: "hidden",
    },
    stageFill: {
      flex: 1,
    },
    stageImage: {
      ...StyleSheet.absoluteFillObject,
    },
    stageScrim: {
      ...StyleSheet.absoluteFillObject,
    },
    stageBody: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: layout.screenPaddingX,
      paddingBottom: spacing.xl,
      paddingTop: spacing.lg,
      gap: spacing.xs,
    },
    stageTitle: {
      ...font("bodySemiBold"),
      fontWeight: "800",
      color: "#F7F3EA",
      fontSize: typography.h2,
      lineHeight: 30,
      textShadowColor: "rgba(0,0,0,0.35)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    stageSub: {
      ...font("body"),
      color: "rgba(247,243,234,0.88)",
      fontSize: typography.caption,
      fontWeight: "600",
      maxWidth: "92%",
    },
    stageCta: {
      alignSelf: "flex-start",
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.brand,
    },
    stageCtaText: {
      ...font("bodySemiBold"),
      fontSize: typography.caption,
      fontWeight: "800",
      color: colors.textOnBrand,
    },
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: layout.screenPaddingX,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderSoft },
    dotActive: { width: 18, backgroundColor: colors.brand },
    ticker: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginHorizontal: layout.screenPaddingX,
      backgroundColor: colors.bgSoft,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    tickerTag: {
      ...font("bodySemiBold"),
      color: colors.brandText,
      fontSize: typography.micro,
      fontWeight: "800",
      backgroundColor: colors.accentSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.xs,
      overflow: "hidden",
    },
    tickerText: {
      ...font("body"),
      flex: 1,
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: "600",
    },
    tickerMore: { color: colors.brand, fontWeight: "800", fontSize: typography.body },
    qualityDot: { width: 8, height: 8, borderRadius: 4 },
  });
}
