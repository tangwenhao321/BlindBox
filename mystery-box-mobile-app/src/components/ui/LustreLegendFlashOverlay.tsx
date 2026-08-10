import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { getLustrePalette, lustreGradientStops } from "../../effects/lustrePalette";

type Props = {
  style?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  tier?: string;
};

/** 传说揭晓时的多色琉光闪屏（替代单色 burst） */
export function LustreLegendFlashOverlay({ style, tier = "TREASURE_LEGEND" }: Props) {
  const lustre = getLustrePalette(tier);
  return (
    <Animated.View pointerEvents="none" style={[styles.host, style]}>
      <LinearGradient
        colors={lustreGradientStops(lustre.flashTint)}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={lustreGradientStops(lustre.hGlow)}
        style={styles.hGlow}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      />
      <LinearGradient
        colors={lustreGradientStops(lustre.vGlow)}
        style={styles.vGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  hGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "32%",
    height: 160,
    opacity: 0.85,
  },
  vGlow: {
    position: "absolute",
    top: "16%",
    bottom: "16%",
    left: "18%",
    width: "64%",
    opacity: 0.7,
  },
});
