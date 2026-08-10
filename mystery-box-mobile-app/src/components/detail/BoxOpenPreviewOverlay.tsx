import { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import { useAppTheme } from "../../context/ThemeContext";
import { resolveRevealTheme } from "../../effects/revealTheme";
import { resolveBoxImageUrl } from "../../utils/boxImage";
import type { MysteryBox } from "../../types";
import { BoxRevealTeaser } from "../ui/BoxRevealTeaser";

type Props = {
  visible: boolean;
  box: MysteryBox;
  onDismiss: () => void;
};

/** 长按预览：全屏开盒前摇（不消耗库存） */
export function BoxOpenPreviewOverlay({ visible, box, onDismiss }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const teaserOpacity = useSharedValue(0);
  const coverUri = resolveBoxImageUrl(box);
  const theme = resolveRevealTheme({
    boxName: box.name,
    categoryName: box.category?.name,
  });

  useEffect(() => {
    if (!visible) {
      teaserOpacity.value = 0;
      return;
    }
    teaserOpacity.value = withTiming(1, { duration: 220 });
    return () => {
      teaserOpacity.value = 0;
    };
  }, [visible, teaserOpacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.mask}>
        <BoxRevealTeaser
          visible={visible}
          boxCoverUri={coverUri}
          teaserOpacity={teaserOpacity}
          accentColor={theme.accent}
        />
        <Animated.Text style={styles.hint}>{t("boxDetails.previewOverlayHint")}</Animated.Text>
        <Text style={[styles.release, { color: colors.textMuted }]}>{t("boxDetails.previewReleaseHint")}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    position: "absolute",
    bottom: 120,
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  release: {
    position: "absolute",
    bottom: 88,
    fontSize: 12,
    fontWeight: "600",
  },
});
