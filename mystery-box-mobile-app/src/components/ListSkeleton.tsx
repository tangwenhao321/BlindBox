import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, shadows, spacing } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  rows?: number;
  /** `card` for grid/catalog tiles; `row` for compact list rows (orders, coupons). */
  variant?: "card" | "row";
};

function Shimmer({ style, staticShimmer }: { style: ViewStyle; staticShimmer: boolean }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    if (staticShimmer) return;
    opacity.value = withRepeat(withTiming(0.95, { duration: 850 }), -1, true);
  }, [opacity, staticShimmer]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: staticShimmer ? 0.7 : opacity.value }));
  return <Animated.View style={[style, animatedStyle]} />;
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
    shimmerBlock: {
      height: 120,
      borderRadius: radius.sm,
      backgroundColor: colors.bgMuted,
      marginBottom: spacing.md,
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
