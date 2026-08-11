import { forwardRef, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { lustreGradientStops } from "../effects/lustrePalette";
import type { RevealTheme } from "../effects/revealTheme";
import { resolveThemedLustre } from "../effects/revealTheme";
import { QualityBadge } from "./ui/QualityBadge";
import { LustreCardEdgeShimmer } from "./ui/LustreCardEdgeShimmer";
import { RemoteImage } from "./ui/RemoteImage";
import type { Product } from "../types";
import { resolveProductImageUrl } from "../utils/boxImage";
import { normalizeQualityTier } from "../utils/quality";
import { nightColors, radius, spacing, typography } from "../styles/tokens";

const CARD_W = 320;
const SHARE_W = 360;
const SHARE_H = 640;

/** Night Cabinet ink panels - no purple/indigo share gradients. */
const INNER_LEGEND = "#2A1810";
const INNER_HIDDEN = nightColors.bgMuted;
const INNER_DEFAULT = nightColors.bgPage;

type Props = {
  boxName: string;
  boxId?: string;
  product: Product;
  burstFrame?: boolean;
  revealTheme?: RevealTheme;
  exportAspect?: "preview" | "share";
  watermarkText?: string;
  watermarkCode?: string;
};

export const RevealShareCard = forwardRef<View, Props>(function RevealShareCard(
  {
    boxName,
    boxId,
    product,
    burstFrame = true,
    revealTheme,
    exportAspect = "preview",
    watermarkText,
    watermarkCode,
  },
  ref,
) {
  const { t } = useTranslation();
  const tier = normalizeQualityTier(product.qualityType);
  const isLegend = tier === "LEGENDARY" || tier === "LEGEND";
  const isHidden = tier === "HIDDEN" || tier === "EPIC";
  const lustreTier = isLegend ? "TREASURE_LEGEND" : isHidden ? "HIDDEN" : "GENERAL";
  const lustre = useMemo(() => resolveThemedLustre(lustreTier, revealTheme, boxId), [lustreTier, revealTheme, boxId]);
  const innerBg = isLegend ? INNER_LEGEND : isHidden ? INNER_HIDDEN : INNER_DEFAULT;
  const showLustreFrame = burstFrame && (isLegend || isHidden);
  const isShareExport = exportAspect === "share";
  const canvasW = isShareExport ? SHARE_W : CARD_W;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={isShareExport ? [styles.shareCanvas, { width: canvasW, height: SHARE_H }] : undefined}
    >
      <LustreCardEdgeShimmer
        width={canvasW}
        borderRadius={radius.lg}
        colors={lustre.rim}
        borderWidth={showLustreFrame ? 3 : 2}
        reduceMotion
        innerBackground={innerBg}
      >
        <View
          style={[
            styles.card,
            isShareExport ? styles.shareCardInner : null,
            isLegend ? styles.legend : isHidden ? styles.hidden : null,
          ]}
        >
        {showLustreFrame ? (
          <>
            <LinearGradient
              colors={lustreGradientStops(lustre.aurora.slice(0, 4))}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.burstRing}
            />
            {isLegend ? (
              <Text style={[styles.burstStamp, { color: lustre.rim[0] }]}>{t("revealShare.burstStamp")}</Text>
            ) : null}
          </>
        ) : null}
        <Text style={styles.brand}>{t("revealShare.brand")}</Text>
        <Text style={styles.box}>{boxName}</Text>
        <View style={[styles.imageWrap, showLustreFrame ? styles.imageWrapRare : null]}>
          <RemoteImage uri={resolveProductImageUrl(product.id, product.name)} style={styles.image} />
          {showLustreFrame ? (
            <LinearGradient
              colors={lustreGradientStops([...lustre.rim.slice(0, 3), lustre.rim[0]])}
              style={styles.imageRim}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          ) : null}
        </View>
        <Text style={styles.name}>{product.name}</Text>
        <QualityBadge tier={product.qualityType} />
        <Text style={styles.footer}>{t("revealShare.footer")}</Text>
        {watermarkText || watermarkCode ? (
          <View style={styles.watermarkWrap} pointerEvents="none">
            {watermarkText ? <Text style={styles.watermarkText}>{watermarkText}</Text> : null}
            {watermarkCode ? <Text style={styles.watermarkCode}>{watermarkCode}</Text> : null}
          </View>
        ) : null}
        </View>
      </LustreCardEdgeShimmer>
    </View>
  );
});

const styles = StyleSheet.create({
  shareCanvas: {
    backgroundColor: nightColors.bgPage,
    paddingTop: "10%",
    paddingBottom: "15%",
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  shareCardInner: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    width: CARD_W - 6,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    overflow: "hidden",
  },
  legend: {},
  hidden: {},
  burstRing: {
    position: "absolute",
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.42,
  },
  burstStamp: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    transform: [{ rotate: "12deg" }],
  },
  brand: { fontSize: typography.caption, color: nightColors.brand },
  box: { fontSize: typography.body, color: nightColors.textTitleSoft },
  imageWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    position: "relative",
  },
  imageWrapRare: {
    shadowColor: nightColors.brand,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  imageRim: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    borderRadius: radius.md,
  },
  image: { width: 160, height: 160, borderRadius: radius.md },
  name: { fontSize: typography.h3, fontWeight: "800", color: nightColors.textPrimary, textAlign: "center" },
  footer: { fontSize: typography.caption, color: nightColors.textMuted, marginTop: spacing.md },
  watermarkWrap: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  watermarkText: { fontSize: 11, color: "rgba(245,240,232,0.85)", fontWeight: "600" },
  watermarkCode: { fontSize: 10, color: "rgba(245,240,232,0.55)", letterSpacing: 1 },
});
