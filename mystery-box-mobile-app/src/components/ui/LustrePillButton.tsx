import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import type { CeremonyTier } from "../../effects/ceremonyTier";
import { resolveThemedLustre, type RevealTheme } from "../../effects/revealTheme";
import { shouldReduceLustreMotion } from "../../effects/revealRemote";
import { LustreCardEdgeShimmer } from "./LustreCardEdgeShimmer";

type Props = {
  tier: CeremonyTier | string;
  boxId?: string;
  revealTheme?: RevealTheme;
  minWidth?: number;
  borderRadius?: number;
  innerBackground: string;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  accessibilityRole?: "button";
  accessibilityLabel?: string;
  children: ReactNode;
};

/** 琉光 pill CTA：渐变描边 + 可选扫光 */
export function LustrePillButton({
  tier,
  boxId,
  revealTheme,
  minWidth = 140,
  borderRadius = 999,
  innerBackground,
  disabled = false,
  onPress,
  testID,
  accessibilityRole = "button",
  accessibilityLabel,
  children,
}: Props) {
  const lustre = resolveThemedLustre(tier, revealTheme, boxId);
  return (
    <LustreCardEdgeShimmer
      width={minWidth}
      borderRadius={borderRadius}
      colors={lustre.rim}
      borderWidth={2}
      reduceMotion={shouldReduceLustreMotion()}
      innerBackground={innerBackground}
    >
      <Pressable
        testID={testID}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.inner,
          disabled ? styles.disabled : null,
          !disabled && pressed ? styles.pressed : null,
        ]}
      >
        {children}
      </Pressable>
    </LustreCardEdgeShimmer>
  );
}

const styles = StyleSheet.create({
  inner: {
    minWidth: 136,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.45 },
});
