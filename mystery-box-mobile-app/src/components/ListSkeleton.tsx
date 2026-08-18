import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, shadows, spacing } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  rows?: number;
  /** `card` list tiles; `row` compact rows; `grid` 2-column mall catalog. */
  variant?: "card" | "row" | "grid";
};

/** RN Animated shimmer — avoids Reanimated on Honor/Harmony first paint. */
function Shimmer({ style, staticShimmer }: { style: ViewStyle; staticShimmer: boolean }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (staticShimmer) {
      opacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.95, duration: 850, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, staticShimmer]);
  return <Animated.View style={[style, { opacity: staticShimmer ? 0.7 : opacity }]} />;
}

export function ListSkeleton(props: Props) {
  const { rows = 4, variant = "card" } = props;
  const styles = useThemedStyles(buildListSkeletonStyles);
  const [staticShimmer, setStaticShimmer] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setStaticShimmer)
      .catch(() => setStaticShimmer(false));
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setStaticShimmer);
    return () => sub?.remove?.();
  }, []);

  if (variant === "grid") {
    return (
      <View style={[styles.wrap, styles.gridWrap]}>
        {Array.from({ length: rows }).map((_, index) => (
          <View key={`skeleton-grid-${index}`} style={styles.gridCard}>
            <Shimmer style={styles.gridShimmerBlock} staticShimmer={staticShimmer} />
            <Shimmer style={styles.linePrimary} staticShimmer={staticShimmer} />
            <Shimmer style={styles.lineSecondary} staticShimmer={staticShimmer} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {Array.from({ length: rows }).map((_, index) =>
        variant === "row" ? (
          <View key={`skeleton-${index}`} style={styles.rowCard}>
            <Shimmer style={styles.rowThumb} staticShimmer={staticShimmer} />
            <View style={styles.rowLines}>
              <Shimmer style={styles.linePrimary} staticShimmer={staticShimmer} />
              <Shimmer style={styles.lineSecondary} staticShimmer={staticShimmer} />
            </View>
          </View>
        ) : (
          <View key={`skeleton-${index}`} style={styles.card}>
            <Shimmer style={styles.shimmerBlock} staticShimmer={staticShimmer} />
            <Shimmer style={styles.linePrimary} staticShimmer={staticShimmer} />
            <Shimmer style={styles.lineSecondary} staticShimmer={staticShimmer} />
          </View>
        ),
      )}
    </View>
  );
}

function buildListSkeletonStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: spacing.md,
    },
    gridWrap: {
      // Parent lists (e.g. mall FlatList) already apply screenPaddingX
      paddingHorizontal: 0,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: spacing.sm,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      overflow: "hidden",
      ...shadows.cardSm,
    },
    gridCard: {
      width: "48%",
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      overflow: "hidden",
      ...shadows.cardSm,
    },
    shimmerBlock: {
      height: 120,
      borderRadius: radius.sm,
      backgroundColor: colors.bgMuted,
      marginBottom: spacing.md,
    },
    gridShimmerBlock: {
      height: 100,
      borderRadius: radius.sm,
      backgroundColor: colors.bgMuted,
      marginBottom: spacing.sm,
    },
    linePrimary: {
      height: 14,
      width: "55%",
      borderRadius: radius.pill,
      backgroundColor: colors.bgMuted,
      marginBottom: spacing.sm,
    },
    lineSecondary: {
      height: 10,
      width: "75%",
      borderRadius: radius.pill,
      backgroundColor: colors.borderSoft,
    },
    rowCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    rowThumb: {
      width: 56,
      height: 56,
      borderRadius: radius.sm,
      backgroundColor: colors.bgMuted,
    },
    rowLines: { flex: 1, gap: spacing.sm },
  });
}
