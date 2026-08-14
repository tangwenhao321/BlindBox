import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import type { Product } from "../../types";
import { onAnimFinished } from "../../effects/reanimated/onAnimFinished";
import { rnSpring } from "../../effects/reanimated/springConfig";
import { lustreGradientStops } from "../../effects/lustrePalette";
import type { RevealTheme } from "../../effects/revealTheme";
import { resolveThemedLustre } from "../../effects/revealTheme";
import { getRevealRemoteConfig, resolveLustreIntensity, shouldReduceLustreMotion } from "../../effects/revealRemote";
import { trackEffectEvent } from "../../effects/telemetry";
import { RevealHighlightShareButton } from "./RevealHighlightShareButton";
import { sortRevealSequence } from "../../effects/revealSequence";
import { RevealVirtualizedSequence } from "./RevealVirtualizedSequence";
import { resolveProductImageUrl } from "../../utils/boxImage";
import { normalizeQualityTier, qualityLabel } from "../../utils/quality";
import { LustreCardEdgeShimmer } from "./LustreCardEdgeShimmer";
import { RevealLustreLayers } from "./RevealLustreLayers";
import { RemoteImage } from "./RemoteImage";
import { QualityBadge } from "./QualityBadge";

const { width: SCREEN_W } = Dimensions.get("window");

type Props = {
  visible: boolean;
  total: number;
  legendary: number;
  hidden: number;
  treasureLegend?: number;
  peerless?: number;
  treasurePeerless?: number;
  prizes?: Product[];
  revealTheme?: RevealTheme;
  boxId?: string;
  reduceMotion?: boolean;
  onDone?: () => void;
  onGoWarehouse?: () => void;
  onOrderAgain?: () => void;
  onVerifyFairness?: () => void;
  onShareHighlight?: () => void;
};

function gridColumns(count: number) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return 3;
}

function cellSize(columns: number) {
  const gap = 10;
  const maxGridW = Math.min(SCREEN_W - 48, 360);
  return Math.floor((maxGridW - gap * (columns - 1)) / columns);
}

export function RevealSummaryBurst({
  visible,
  total,
  legendary,
  hidden,
  treasureLegend = 0,
  peerless = 0,
  treasurePeerless = 0,
  prizes = [],
  revealTheme,
  boxId,
  reduceMotion = false,
  onDone,
  onGoWarehouse,
  onOrderAgain,
  onVerifyFairness,
  onShareHighlight,
}: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<"hero" | "grid">("hero");
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroTouchLocked, setHeroTouchLocked] = useState(true);
  const [heroZoomed, setHeroZoomed] = useState(false);
  const heroTapCountRef = useRef(0);
  const heroTapResetRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.9);
  const sortedPrizes = useMemo(() => sortRevealSequence(prizes), [prizes]);
  const heroPrize = sortedPrizes[sortedPrizes.length - 1];
  const skipHero = reduceMotion || sortedPrizes.length <= 1;
  const heroMs = getRevealRemoteConfig().summaryHeroMs;
  const columns = gridColumns(sortedPrizes.length || total);
  const tile = cellSize(columns);
  const hasCta = !!(onGoWarehouse || onOrderAgain || onVerifyFairness);
  const holdMs = sortedPrizes.length > 1 ? 6200 : hasCta ? 4800 : 3200;
  const batchThreshold = getRevealRemoteConfig().batchRevealThreshold;
  const useVirtualGrid = sortedPrizes.length >= batchThreshold;

  const hasRare = legendary + hidden > 0;
  const summaryTier = legendary > 0 ? "TREASURE_LEGEND" : hidden > 0 ? "HIDDEN" : "GENERAL";
  const lustre = useMemo(
    () => resolveThemedLustre(summaryTier, revealTheme, boxId),
    [summaryTier, revealTheme, boxId],
  );
  const lustreIntensity = resolveLustreIntensity(hasRare ? (legendary > 0 ? 0.72 : 0.52) : 0.35);
  const lustreMotion = shouldReduceLustreMotion(reduceMotion);
  const panelW = Math.min(SCREEN_W - 32, 400);
  const flash = useSharedValue(0);
  const gridCollective = useSharedValue(1);

  const rareLine = useMemo(() => {
    if (legendary + hidden > 0) {
      return t("revealSummary.rareMixed", { legendary, hidden });
    }
    return t("revealSummary.rareNone");
  }, [legendary, hidden, t]);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(heroOpacity);
      cancelAnimation(heroScale);
      setPhase("hero");
      return;
    }
    setPhase(skipHero ? "grid" : "hero");
    opacity.value = 0;
    scale.value = 0.85;
    heroOpacity.value = 0;
    heroScale.value = 0.9;
    if (hasRare && !lustreMotion) {
      flash.value = 0;
      flash.value = withSequence(
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withDelay(holdMs - 220, withTiming(0, { duration: 280 })),
      );
    } else {
      flash.value = 0;
    }
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(heroOpacity);
      cancelAnimation(heroScale);
      cancelAnimation(flash);
    };
  }, [visible, skipHero, hasRare, lustreMotion, holdMs, opacity, scale, heroOpacity, heroScale, flash]);

  useEffect(() => {
    if (!visible || phase !== "hero" || skipHero) return;
    setHeroTouchLocked(true);
    const unlock = setTimeout(() => setHeroTouchLocked(false), 1000);
    return () => clearTimeout(unlock);
  }, [visible, phase, skipHero, heroPrize?.id]);

  useEffect(() => {
    if (!visible || phase !== "hero" || skipHero) return;
    if (heroPaused) return;
    heroOpacity.value = withSpring(1, rnSpring(7, 180));
    heroScale.value = withSpring(1, rnSpring(6, 140));
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    heroTimerRef.current = setTimeout(() => setPhase("grid"), heroMs);
    return () => {
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    };
  }, [visible, phase, skipHero, heroMs, heroOpacity, heroScale, opacity, heroPaused]);

  useEffect(() => {
    if (!visible || phase !== "grid") return;
    heroOpacity.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) });
    opacity.value = 0;
    scale.value = 0.85;
    if (total > 1) {
      gridCollective.value = 0.96;
      gridCollective.value = withSequence(
        withSpring(1.04, rnSpring(8, 160)),
        withSpring(1, rnSpring(6, 120)),
      );
    } else {
      gridCollective.value = 1;
    }
    opacity.value = withSequence(
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withDelay(
        holdMs,
        withTiming(
          0,
          { duration: 360, easing: Easing.in(Easing.cubic) },
          onDone ? onAnimFinished(onDone) : undefined,
        ),
      ),
    );
    scale.value = withSequence(
      withSpring(1, rnSpring(6, 140)),
      withDelay(holdMs, withTiming(0.85, { duration: 0 })),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [visible, phase, opacity, scale, onDone, holdMs]);

  const hostStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * gridCollective.value }],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flash.value, [0, 0.4, 1], [0, 0.85, 0.35]),
  }));

  const skipToGrid = () => {
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    trackEffectEvent("reveal_summary_hero_skip", { total, misclickGuarded: heroPaused });
    setHeroZoomed(false);
    heroScale.value = withSpring(1, rnSpring(6, 140));
    setPhase("grid");
  };

  const heroPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          phase === "hero" && !skipHero && (Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12),
        onPanResponderMove: (_, g) => {
          if (g.dx < 0) {
            heroOpacity.value = Math.max(0.55, 1 + g.dx / 220);
          } else if (g.dx > 0) {
            const zoom = 1 + Math.min(0.22, g.dx / 280);
            heroScale.value = zoom;
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx < -72) {
            skipToGrid();
            return;
          }
          if (g.dx > 72) {
            setHeroZoomed(true);
            heroScale.value = withSpring(1.18, rnSpring(5, 150));
            if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
            return;
          }
          heroOpacity.value = withTiming(1, { duration: 180 });
          heroScale.value = withSpring(heroZoomed ? 1.18 : 1, rnSpring(6, 140));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
    [phase, skipHero, heroOpacity, heroScale, heroZoomed],
  );

  const handleHeroOverlayPress = () => {
    if (heroTouchLocked) return;
    heroTapCountRef.current += 1;
    if (heroTapResetRef.current) clearTimeout(heroTapResetRef.current);
    heroTapResetRef.current = setTimeout(() => {
      heroTapCountRef.current = 0;
    }, 450);
    const hasRareHero =
      peerless + treasurePeerless > 0 || legendary + hidden + treasureLegend > 0;
    if (hasRareHero && heroTapCountRef.current === 1 && !heroPaused) {
      setHeroPaused(true);
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
      return;
    }
    skipToGrid();
  };

  if (!visible) return null;

  const heroImageUri = heroPrize
    ? resolveProductImageUrl(heroPrize.id, heroPrize.name, heroPrize.cover)
    : undefined;
  const heroQuality = heroPrize ? normalizeQualityTier(heroPrize.qualityType) : "GENERAL";

  const heroInner = heroPrize ? (
    <View style={styles.heroInner}>
      <Text style={styles.heroCaption}>{t("revealSummary.heroCaption")}</Text>
      <View style={styles.heroImageWrap}>
        <RemoteImage uri={heroImageUri ?? ""} style={styles.heroImage} contentFit="cover" />
        <View style={styles.heroBadge}>
          <QualityBadge tier={heroPrize.qualityType} />
        </View>
      </View>
      <Text style={styles.heroName} numberOfLines={2}>
        {heroPrize.name}
      </Text>
      <Text style={styles.heroTier}>{qualityLabel(heroQuality, t)}</Text>
      <RevealHighlightShareButton onPress={onShareHighlight} />
      <Pressable style={styles.heroSkipBtn} onPress={skipToGrid} accessibilityRole="button">
        <Text style={styles.heroSkipText}>{t("revealSummary.skipToGrid")}</Text>
      </Pressable>
    </View>
  ) : null;

  const cardInner = (
    <View style={styles.cardInner}>
      <Text style={styles.title}>{t("revealSummary.title")}</Text>
      <Text style={styles.count}>{t("revealSummary.count", { total })}</Text>
      <Text style={[styles.rare, hasRare ? styles.rareHighlight : null]}>{rareLine}</Text>

      {sortedPrizes.length > 0 ? (
        useVirtualGrid ? (
          <>
            <RevealVirtualizedSequence
              products={sortedPrizes}
              revealIndex={sortedPrizes.length - 1}
              renderItem={() => null}
            />
            <FlatList
              data={sortedPrizes}
              key={`grid-${columns}`}
              numColumns={columns}
              style={styles.gridScroll}
              contentContainerStyle={styles.gridContent}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={({ item, index }) => {
                const imageUri = resolveProductImageUrl(item.id, item.name, item.cover);
                const q = normalizeQualityTier(item.qualityType);
                const isRareTile = q === "LEGENDARY" || q === "HIDDEN";
                return (
                  <View
                    style={[styles.tile, { width: tile, minHeight: tile + 36 }, isRareTile ? styles.tileRare : null]}
                  >
                    <View style={[styles.tileImageWrap, { width: tile, height: tile }]}>
                      <RemoteImage uri={imageUri} style={styles.tileImage} contentFit="cover" />
                      <View style={styles.tileBadge}>
                        <QualityBadge tier={item.qualityType} compact />
                      </View>
                    </View>
                    <Text style={styles.tileName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.tileTier} numberOfLines={1}>
                      {qualityLabel(q, t)}
                    </Text>
                  </View>
                );
              }}
            />
          </>
        ) : (
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          bounces={sortedPrizes.length > 6}
        >
          <View style={[styles.grid, { width: columns * tile + (columns - 1) * 10 }]}>
            {sortedPrizes.map((item, index) => {
              const imageUri = resolveProductImageUrl(item.id, item.name, item.cover);
              const q = normalizeQualityTier(item.qualityType);
              const isRareTile = q === "LEGENDARY" || q === "HIDDEN";
              return (
                <View
                  key={`${item.id}-${index}`}
                  style={[styles.tile, { width: tile, minHeight: tile + 36 }, isRareTile ? styles.tileRare : null]}
                >
                  <View style={[styles.tileImageWrap, { width: tile, height: tile }]}>
                    <RemoteImage uri={imageUri} style={styles.tileImage} contentFit="cover" />
                    <View style={styles.tileBadge}>
                      <QualityBadge tier={item.qualityType} compact />
                    </View>
                  </View>
                  <Text style={styles.tileName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.tileTier} numberOfLines={1}>
                    {qualityLabel(q, t)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        )
      ) : null}

      {hasCta ? (
        <View style={styles.ctaRow}>
          {onVerifyFairness ? (
            <Pressable
              style={({ pressed }) => [styles.ctaBtn, styles.ctaSecondary, pressed ? styles.ctaPressed : null]}
              onPress={() => {
                onDone?.();
                onVerifyFairness();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("revealSummary.verifyFairnessA11y")}
            >
              <Text style={styles.ctaSecondaryText}>{t("revealSummary.verifyFairness")}</Text>
            </Pressable>
          ) : null}
          {onGoWarehouse ? (
            <Pressable
              style={({ pressed }) => [styles.ctaBtn, styles.ctaSecondary, pressed ? styles.ctaPressed : null]}
              onPress={() => {
                onDone?.();
                onGoWarehouse();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("revealSummary.goWarehouseA11y")}
            >
              <Text style={styles.ctaSecondaryText}>{t("revealSummary.goWarehouse")}</Text>
            </Pressable>
          ) : null}
          {onOrderAgain ? (
            <Pressable
              style={({ pressed }) => [styles.ctaBtn, styles.ctaPrimary, pressed ? styles.ctaPressed : null]}
              onPress={() => {
                onDone?.();
                onOrderAgain();
              }}
              accessibilityRole="button"
              accessibilityLabel={t("revealSummary.orderAgainA11y")}
            >
              <Text style={styles.ctaPrimaryText}>{t("revealSummary.orderAgain")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          style={styles.dismissBtn}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel={t("revealSummary.viewSettlement")}
        >
          <Text style={styles.dismissText}>{t("revealSummary.viewSettlement")}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <Animated.View style={[styles.host, hostStyle]} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={
          phase === "hero" && !skipHero && !heroTouchLocked ? handleHeroOverlayPress : onDone
        }
        disabled={phase === "hero" && !skipHero && heroTouchLocked}
        accessibilityLabel={t("revealSummary.closeA11y")}
      />
      {hasRare && !lustreMotion ? (
        <View style={styles.lustreBackdrop} pointerEvents="none">
          <RevealLustreLayers visible tier={summaryTier} intensity={lustreIntensity} palette={lustre} />
        </View>
      ) : null}
      {hasRare && !lustreMotion ? (
        <Animated.View style={[styles.summaryFlash, flashStyle]} pointerEvents="none">
          <LinearGradient
            colors={lustreGradientStops(lustre.flashTint)}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.panel, cardStyle]} pointerEvents="box-none">
        {phase === "hero" && !skipHero ? (
          <Animated.View
            style={[styles.heroPanel, heroStyle]}
            pointerEvents="box-none"
            {...heroPanResponder.panHandlers}
          >
            {hasRare ? (
              <LustreCardEdgeShimmer
                width={panelW}
                borderRadius={20}
                colors={lustre.rim}
                borderWidth={2.5}
                reduceMotion={lustreMotion}
                innerBackground="rgba(13,13,20,0.94)"
              >
                {heroInner}
              </LustreCardEdgeShimmer>
            ) : (
              <LinearGradient colors={["#1a1030f2", "#0d0d14f2"]} style={styles.cardPlain}>
                {heroInner}
              </LinearGradient>
            )}
          </Animated.View>
        ) : null}
        {phase === "grid" ? (
          hasRare ? (
            <LustreCardEdgeShimmer
              width={panelW}
              borderRadius={20}
              colors={lustre.rim}
              borderWidth={2.5}
              reduceMotion={lustreMotion}
              innerBackground="rgba(13,13,20,0.94)"
            >
              {cardInner}
            </LustreCardEdgeShimmer>
          ) : (
            <LinearGradient colors={["#1a1030f2", "#0d0d14f2"]} style={styles.cardPlain}>
              {cardInner}
            </LinearGradient>
          )
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2100,
    elevation: 2100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  lustreBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  summaryFlash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  panel: {
    width: "100%",
    maxHeight: "88%",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPlain: {
    width: "100%",
    maxWidth: 400,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
  },
  cardInner: {
    width: "100%",
    maxWidth: 392,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1,
  },
  count: {
    marginTop: 8,
    color: "rgba(255,255,255,0.92)",
    fontSize: 17,
    fontWeight: "700",
  },
  rare: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  rareHighlight: {
    color: "rgba(255, 214, 120, 0.95)",
  },
  gridScroll: {
    marginTop: 16,
    maxHeight: 340,
    width: "100%",
  },
  gridContent: {
    alignItems: "center",
    paddingBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  tile: {
    alignItems: "center",
    gap: 4,
  },
  tileRare: {
    shadowColor: "#FBBF24",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tileImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  tileBadge: {
    position: "absolute",
    left: 4,
    top: 4,
  },
  tileName: {
    width: "100%",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 14,
  },
  tileTier: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    fontWeight: "600",
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    width: "100%",
    justifyContent: "center",
  },
  ctaBtn: {
    minWidth: 108,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaPrimary: {
    backgroundColor: "#FFD678",
  },
  ctaSecondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  ctaPressed: { opacity: 0.85 },
  ctaPrimaryText: { color: "#1a1028", fontWeight: "900", fontSize: 15 },
  ctaSecondaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  dismissBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dismissText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
    fontSize: 14,
  },
  heroPanel: {
    width: "100%",
    alignItems: "center",
  },
  heroInner: {
    width: "100%",
    maxWidth: 392,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: "center",
  },
  heroCaption: {
    color: "rgba(255, 214, 120, 0.95)",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  heroImageWrap: {
    width: 168,
    height: 168,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroBadge: {
    position: "absolute",
    left: 8,
    top: 8,
  },
  heroName: {
    marginTop: 14,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 26,
  },
  heroTier: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "700",
  },
  heroSkipBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  heroSkipText: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    fontSize: 13,
  },
});
