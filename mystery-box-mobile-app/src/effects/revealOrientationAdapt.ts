import { Dimensions } from "react-native";

let invertedStub = false;
let landscapeOverride: boolean | null = null;

export function isInvertedOrLandscape(): boolean {
  if (landscapeOverride != null) return landscapeOverride || invertedStub;
  try {
    const dim = Dimensions.get?.("window");
    if (!dim) return invertedStub;
    return dim.width > dim.height || invertedStub;
  } catch {
    return invertedStub;
  }
}

export function resolveOrientationEffectScale(base = 1): number {
  return isInvertedOrLandscape() ? Math.round(base * 92) / 100 : base;
}

export function setOrientationStubForTests(opts: {
  inverted?: boolean;
  landscape?: boolean | null;
}): void {
  if (opts.inverted != null) invertedStub = opts.inverted;
  if (opts.landscape !== undefined) landscapeOverride = opts.landscape;
}

export function resetOrientationStubForTests(): void {
  invertedStub = false;
  landscapeOverride = null;
}
