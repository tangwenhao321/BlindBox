import type { SharedValue } from "react-native-reanimated";

/** 开箱揭晓动效共享数值（Reanimated SharedValue） */
export type RevealMotionValues = {
  revealOpacity: SharedValue<number>;
  revealScale: SharedValue<number>;
  titlePunch: SharedValue<number>;
  rainProgress: SharedValue<number>;
  confettiProgress: SharedValue<number>;
  flashOpacity: SharedValue<number>;
  shakeX: SharedValue<number>;
  prizeCardScale: SharedValue<number>;
  prizeCardOpacity: SharedValue<number>;
  cardFlip: SharedValue<number>;
  boxTeaserOpacity: SharedValue<number>;
};
