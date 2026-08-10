import { memo, useEffect, useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import type { ThemeColors } from "../../styles/themes";
import { BOX_IMAGE_FALLBACK } from "../../utils/boxImage";
import { resolveNetworkTierImagePriority, resolveNetworkTierImageUri } from "../../effects/revealNetworkTier";
import { isRevealImageUriBlocked } from "../../effects/revealRegionCompliance";

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
  const effectivePriority = priority === "normal" ? resolveNetworkTierImagePriority() : priority;
  const blocked = isRevealImageUriBlocked(uri);
  const tierUri = blocked || !uri ? uri : resolveNetworkTierImageUri(uri);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const source = failed || blocked || !uri ? BOX_IMAGE_FALLBACK : tierUri;

  return (
    <View style={[styles.placeholder, style]} accessibilityLabel={accessibilityLabel}>
      <Image
        source={{ uri: source }}
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
  });
}
