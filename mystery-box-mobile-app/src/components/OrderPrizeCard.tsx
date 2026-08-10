import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { RemoteImage } from "./ui/RemoteImage";
import { LustreCardEdgeShimmer } from "./ui/LustreCardEdgeShimmer";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { lustreTierFromQuality } from "../effects/lustrePalette";
import { resolveThemedLustre } from "../effects/revealTheme";
import { shouldReduceLustreMotion } from "../effects/revealRemote";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { Product } from "../types";
import { resolveProductImageUrl } from "../utils/boxImage";
import { qualityLabelFromRaw } from "../utils/quality";

type Props = {
  product: Product;
  duplicateIndex?: number;
  duplicateCount?: number;
  onLongPressStory?: () => void;
};

export function OrderPrizeCard({ product, duplicateIndex, duplicateCount, onLongPressStory }: Props) {
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildStyles);
  const imageUri = resolveProductImageUrl(product.id, product.name, product.cover);
  const qualityLabel = qualityLabelFromRaw(product.qualityType, t);
  const lustreTier = lustreTierFromQuality(product.qualityType);
  const lustre = lustreTier ? resolveThemedLustre(lustreTier) : null;
  const qt = (product.qualityType ?? "").toUpperCase();
  const isDiscontinued = qt.includes("DISCONTINUED") || qt.includes("OFF_SHELF");
  const isEventLimited = qt.includes("EVENT") || qt.includes("LIMITED_RUN");

  const thumb = (
    <View style={styles.thumbInner}>
      <RemoteImage uri={imageUri} style={styles.image} contentFit="cover" />
    </View>
  );

  const isStackedDuplicate =
    duplicateCount != null &&
    duplicateCount >= 2 &&
    duplicateIndex != null &&
    (product.qualityType === "LEGENDARY" || product.qualityType === "HIDDEN");

  return (
    <Pressable
      style={[styles.wrap, isStackedDuplicate ? styles.wrapStacked : null]}
      accessibilityLabel={`${product.name} · ${qualityLabel}`}
      onLongPress={onLongPressStory}
      delayLongPress={420}
    >
      <View style={styles.row}>
        {lustre ? (
          <LustreCardEdgeShimmer
            width={56}
            height={56}
            borderRadius={radius.md}
            colors={lustre.rim}
            borderWidth={2}
            reduceMotion={shouldReduceLustreMotion()}
            innerBackground={themeColors.bgBrandSoft}
          >
            {thumb}
          </LustreCardEdgeShimmer>
        ) : (
          <View style={styles.thumbPlain}>{thumb}</View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.badgeRow}>
            <LinearGradient colors={["#FF6B8A", "#FF8A3D"]} style={styles.qualityBadge}>
              <Text style={styles.qualityText}>{qualityLabel}</Text>
            </LinearGradient>
            {duplicateCount != null && duplicateCount > 1 && duplicateIndex != null ? (
              <View style={styles.dupBadge}>
                <Text style={styles.dupText}>
                  {t("orderDetails.duplicateBadge", { index: duplicateIndex, count: duplicateCount })}
                </Text>
              </View>
            ) : null}
            {isDiscontinued ? (
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{t("orderDetails.tagDiscontinued", { defaultValue: "Discontinued" })}</Text>
              </View>
            ) : null}
            {isEventLimited ? (
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{t("orderDetails.tagEventLimited", { defaultValue: "Event" })}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      overflow: "hidden",
      marginBottom: spacing.sm,
    },
    wrapStacked: {
      shadowColor: "#FFD54F",
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
    },
    thumbPlain: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      overflow: "hidden",
      backgroundColor: colors.bgSoft,
    },
    thumbInner: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      overflow: "hidden",
      backgroundColor: colors.bgSoft,
    },
    image: { width: "100%", height: "100%" },
    body: { flex: 1, gap: spacing.xs, minWidth: 0 },
    name: {
      fontWeight: "700",
      color: colors.textPrimary,
      fontSize: typography.caption,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: spacing.xs,
    },
    qualityBadge: {
      alignSelf: "flex-start",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    dupBadge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: colors.bgSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dupText: {
      color: colors.textSecondary,
      fontSize: typography.micro,
      fontWeight: "800",
    },
    tagBadge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: colors.bgBrandSoft,
    },
    tagText: {
      color: colors.brand,
      fontSize: typography.micro,
      fontWeight: "800",
    },
    qualityText: {
      color: colors.textOnBrand,
      fontSize: typography.micro,
      fontWeight: "800",
    },
  });
}
