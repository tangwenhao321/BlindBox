import { useEffect, useMemo, useState } from "react";
import { Dimensions, Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getRevealRemoteConfig } from "../effects/revealRemote";
import { getRuntimeRevealPlayerFit } from "../utils/revealSettings";
import { mirrorRevealLayout } from "../effects/revealRtl";
import { resolveOrientationEffectScale } from "../effects/revealOrientationAdapt";
import i18n from "../i18n";

export type RevealLayoutModel = {
  contentInsets: { top: number; bottom: number; left: number; right: number };
  effectScale: number;
  isCompactHeight: boolean;
  isWideFold: boolean;
  isLandscapeTablet: boolean;
  keyboardInset: number;
  overlayChromeTop: number;
  chromeSafeTop: number;
  splitScale: number;
  carMode: boolean;
  layoutMirror: ReturnType<typeof mirrorRevealLayout>;
};

export function useRevealLayout(): RevealLayoutModel {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const remote = getRevealRemoteConfig();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardInset(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardInset(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return useMemo(() => {
    const isCompactHeight = height < 520 || width < 360;
    const isWideFold = width >= 600;
    const isLandscapeTablet = width > height && width >= 768;
    const compactScale = isCompactHeight ? remote.compactRevealScale : 1;
    const foldScale = isWideFold && !isLandscapeTablet ? 0.92 : 1;
    const playerFitScale = getRuntimeRevealPlayerFit() === "original" ? 1 : 0.72;
    const splitScale = isLandscapeTablet ? 0.88 : 1;
    const carMode = width > height && width >= 720 && height <= 480;
    const chromeTop = Math.max(insets.top, Platform.OS === "android" ? 8 : 0) + 96 + 36;
    const layoutMirror = mirrorRevealLayout(i18n.language);
    const rawScale = Math.min(1, compactScale * foldScale * playerFitScale * splitScale);
    return {
      contentInsets: {
        top: Math.max(insets.top, Platform.OS === "android" ? 8 : 0),
        bottom: Math.max(insets.bottom, keyboardInset, 8),
        left: Math.max(insets.left, 8),
        right: Math.max(insets.right, 8),
      },
      effectScale: resolveOrientationEffectScale(rawScale),
      isCompactHeight,
      isWideFold,
      isLandscapeTablet,
      keyboardInset,
      overlayChromeTop: chromeTop,
      chromeSafeTop: chromeTop,
      splitScale,
      carMode,
      layoutMirror,
    };
  }, [
    insets.top,
    insets.bottom,
    insets.left,
    insets.right,
    width,
    height,
    remote.compactRevealScale,
    keyboardInset,
  ]);
}
