import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Product } from "../../types";
import { RevealPressChip } from "./RevealPressChip";
import { RevealProgressBanner } from "./RevealProgressBanner";
import {
  disableTemporaryTurboForOrder,
  enableTemporaryTurboForOrder,
  isTemporaryTurboActive,
} from "../../effects/revealTemporaryTurbo";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useRevealLayout } from "../../hooks/useRevealLayout";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  visible: boolean;
  revealIndex: number;
  revealProducts: Product[];
  orderId?: string;
  flashPeak?: boolean;
  queueLength?: number;
  showSkipBar?: boolean;
  showGestureShield?: boolean;
  onSkipCurrent: () => void;
  onSkipRemaining?: () => void;
  onTurboToggle?: (enabled: boolean) => void;
};

export function RevealSequenceChrome({
  visible,
  revealIndex,
  revealProducts,
  orderId,
  flashPeak = false,
  queueLength = 0,
  showSkipBar = true,
  showGestureShield = true,
  onSkipCurrent,
  onSkipRemaining,
  onTurboToggle,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildChromeStyles);
  const layout = useRevealLayout();
  const [turboActive, setTurboActive] = useState(() => isTemporaryTurboActive(orderId));

  const toggleTurbo = useCallback(() => {
    if (!orderId) return;
    if (isTemporaryTurboActive(orderId)) {
      disableTemporaryTurboForOrder(orderId);
      setTurboActive(false);
      onTurboToggle?.(false);
    } else {
      enableTemporaryTurboForOrder(orderId);
      setTurboActive(true);
      onTurboToggle?.(true);
    }
  }, [orderId, onTurboToggle]);

  if (!visible) return null;

  return (
    <>
      {showGestureShield ? <View style={styles.gestureShield} pointerEvents="box-none" /> : null}
      {queueLength > 0 ? (
        <View style={styles.queueBadge} pointerEvents="none">
          <Text style={styles.queueBadgeText}>{t("orderResult.queuePending", { count: queueLength })}</Text>
        </View>
      ) : null}
      <RevealProgressBanner
        visible={revealProducts.length > 1}
        revealedProducts={revealProducts.slice(0, revealIndex)}
        allProducts={revealProducts}
        revealIndex={revealIndex}
        orderId={orderId}
        total={revealProducts.length}
        chromeSafeTop={layout.chromeSafeTop}
        splitScale={layout.splitScale}
        flashPeak={flashPeak}
      />
      {showSkipBar ? (
        <View style={styles.revealSkipBar} pointerEvents="box-none">
          <RevealPressChip
            style={styles.skipRevealBtn}
            onPress={onSkipCurrent}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            accessibilityRole="button"
            accessibilityLabel={t("orderResult.skipCurrentA11y")}
          >
            <Text style={styles.skipRevealTextLight}>{t("orderResult.skipCurrent")}</Text>
          </RevealPressChip>
          {revealProducts.length > 1 && onSkipRemaining ? (
            <RevealPressChip
              style={styles.skipRevealBtn}
              onPress={onSkipRemaining}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              accessibilityRole="button"
              accessibilityLabel={t("orderResult.skipRemainingA11y")}
            >
              <Text style={styles.skipRevealTextLight}>{t("orderResult.skipRemaining")}</Text>
            </RevealPressChip>
          ) : null}
          {orderId ? (
            <RevealPressChip
              style={[styles.skipRevealBtn, turboActive ? styles.turboChipActive : null]}
              onPress={toggleTurbo}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              accessibilityRole="button"
              accessibilityLabel={t("orderResult.temporaryTurboA11y")}
            >
              <Text style={styles.skipRevealTextLight}>{t("orderResult.temporaryTurbo")}</Text>
            </RevealPressChip>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function buildChromeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    gestureShield: {
      ...StyleSheet.absoluteFillObject,
      zIndex: revealLayerZIndex.skipBar,
    },
    revealSkipBar: {
      position: "absolute",
      top: 52,
      left: 0,
      right: 0,
      zIndex: revealLayerZIndex.skipBar,
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.sm,
    },
    skipRevealBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    skipRevealTextLight: { color: "#FFFFFF", fontWeight: "700", fontSize: typography.caption },
    queueBadge: {
      position: "absolute",
      top: 96,
      alignSelf: "center",
      zIndex: revealLayerZIndex.badge,
      backgroundColor: "rgba(0,0,0,0.55)",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    queueBadgeText: { color: "#fff", fontSize: typography.caption, fontWeight: "700" },
    turboChipActive: { backgroundColor: colors.brand },
  });
}
