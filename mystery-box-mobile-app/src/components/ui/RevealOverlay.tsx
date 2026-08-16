import type { SharedValue } from "react-native-reanimated";
import type { EffectProfile } from "../../effects/config";
import type { RevealTheme } from "../../effects/revealTheme";
import type { RevealPacing } from "../../effects/revealSequence";
import type { ReduceMotionLevel } from "../../effects/revealRemote";
import { ExpoGoRevealOverlay } from "./ExpoGoRevealOverlay";
import { OpenBoxRevealOverlay } from "./OpenBoxRevealOverlay";

type BaseProps = {
  visible: boolean;
  tier: string;
  profile: EffectProfile;
  revealTheme?: RevealTheme;
  boxId?: string;
  subtitle?: string;
  prizeName?: string;
  prizeImageUri?: string;
  prizeQualityType?: string;
  boxCoverUri?: string;
  showBoxTeaser?: boolean;
  teaserVariant?: "full" | "mini";
  pacing?: RevealPacing;
  playToken?: string | number;
  fullScreen?: boolean;
  reduceMotion?: boolean;
  reduceMotionLevel?: ReduceMotionLevel;
  degradeLevel?: number;
  skipParticles?: boolean;
  skipTeaserAnim?: boolean;
  accelerateProgress?: number;
  isAccelerating?: boolean;
  accelerateSpeedLabel?: "1.5x" | "2.5x" | null;
  onAcceleratePressIn?: () => void;
  onAcceleratePressOut?: () => void;
  collectionEasterEgg?: boolean;
  revealIndex?: number;
  totalReveals?: number;
  onPressSkip?: () => void;
  onLongPressAccelerate?: () => void;
  a11yFlashScale?: number;
  a11yLustreScale?: number;
  atmosphereParticleScale?: number;
  pityBanner?: string;
};

type ReanimatedProps = BaseProps & {
  motionDriver: "reanimated";
  revealOpacity: SharedValue<number>;
  revealScale: SharedValue<number>;
  titlePunch: SharedValue<number>;
  rainProgress: SharedValue<number>;
  confettiProgress: SharedValue<number>;
  flashOpacity: SharedValue<number>;
  shakeX: SharedValue<number>;
  prizeCardScale?: SharedValue<number>;
  prizeCardOpacity?: SharedValue<number>;
  cardFlip?: SharedValue<number>;
  boxTeaserOpacity?: SharedValue<number>;
};

type ExpoGoProps = BaseProps & {
  motionDriver: "expo-go";
};

export type RevealOverlayProps = ReanimatedProps | ExpoGoProps;

export function RevealOverlay(props: RevealOverlayProps) {
  if (props.motionDriver === "expo-go") {
    const { motionDriver: _, ...rest } = props;
    return (
      <ExpoGoRevealOverlay
        {...rest}
        showBoxTeaser={rest.showBoxTeaser}
        boxCoverUri={rest.boxCoverUri}
        pacing={rest.pacing}
      />
    );
  }
  const { motionDriver: _, ...rest } = props;
  return <OpenBoxRevealOverlay {...rest} />;
}
