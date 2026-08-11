import { memo, useEffect, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  PixelRatio,
  StyleSheet,
  View,
  type ImageStyle,
  type LayoutChangeEvent,
  type StyleProp,
} from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import type { ThemeColors } from "../../styles/themes";
import { BOX_IMAGE_FALLBACK } from "../../utils/boxImage";
import { resolveNetworkTierImagePriority, resolveNetworkTierImageUri } from "../../effects/revealNetworkTier";
import { isRevealImageUriBlocked } from "../../effects/revealRegionCompliance";
import { PlaceholderCover } from "./PlaceholderCover";

type Props = {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: "cover" | "contain";
  accessibilityLabel?: string;
  /** High for above-the-fold hero images; low for list thumbnails. */
  priority?: "low" | "normal" | "high";
  transitionMs?: number;
  onReady?: () => void;
};

function RemoteImageInner({
  uri,
  style,
  contentFit = "cover",
  accessibilityLabel,
  priority = "normal",
  transitionMs = 200,
  onReady,
}: Props) {
  const styles = useThemedStyles(buildRemoteImageStyles);
  const [failed, setFailed] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState<number | undefined>();
  const effectivePriority = priority === "normal" ? resolveNetworkTierImagePriority() : priority;
  const blocked = isRevealImageUriBlocked(uri);
  const targetWidth =
    layoutWidth != null && layoutWidth > 0
      ? Math.ceil(layoutWidth * PixelRatio.get())
      : undefined;
  const tierUri = blocked || !uri ? uri : resolveNetworkTierImageUri(uri, undefined, targetWidth);
  const useFallback = failed || blocked || !uri;

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  useEffect(() => {
    if (useFallback && BOX_IMAGE_FALLBACK == null) {
      onReady?.();
    }
  }, [useFallback, onReady]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (!(w > 0)) return;
    setLayoutWidth((prev) => (prev != null && Math.abs(prev - w) < 1 ? prev : w));
  };

  return (
    <View style={[styles.placeholder, style]} accessibilityLabel={accessibilityLabel} onLayout={onLayout}>
      {useFallback ? (
        <>
          <PlaceholderCover style={StyleSheet.absoluteFill} />
          {BOX_IMAGE_FALLBACK != null ? (
            <Image
              source={BOX_IMAGE_FALLBACK}
              style={[StyleSheet.absoluteFill, styles.fallbackIcon]}
              contentFit="contain"
              transition={transitionMs}
              cachePolicy="memory-disk"
              recyclingKey="local-fallback"
              priority={effectivePriority}
              onLoad={() => onReady?.()}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
        </>
      ) : (
        <Image
          source={{ uri: tierUri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={transitionMs}
          cachePolicy="memory-disk"
          recyclingKey={uri || "fallback"}
          priority={effectivePriority}
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
          onLoad={() => onReady?.()}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

export const RemoteImage = memo(RemoteImageInner);

export function RemoteImageLoading({ style }: { style?: StyleProp<ImageStyle> }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildRemoteImageStyles);
  return (
    <View style={[styles.placeholder, styles.loading, style]}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

function buildRemoteImageStyles(colors: ThemeColors) {
  return StyleSheet.create({
    placeholder: {
      overflow: "hidden",
      backgroundColor: colors.bgMuted,
    },
    loading: {
      alignItems: "center",
      justifyContent: "center",
    },
    fallbackIcon: {
      opacity: 0.35,
      transform: [{ scale: 0.55 }],
    },
  });
}
