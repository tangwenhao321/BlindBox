import { Dimensions, PixelRatio, Platform } from "react-native";

type AndroidConstants = {
  Brand?: string;
  Manufacturer?: string;
  Model?: string;
  isTesting?: boolean;
};

function androidIdentity(): string {
  const c = (Platform as { constants?: AndroidConstants }).constants;
  return `${c?.Brand ?? ""} ${c?.Manufacturer ?? ""} ${c?.Model ?? ""}`.toLowerCase();
}

/**
 * Huawei / Honor and similar OEM builds where Reanimated worklets are unreliable
 * (incl. many HarmonyOS devices reporting as Android).
 */
export function isHarmonyLikeDevice(): boolean {
  if (Platform.OS !== "android") return false;
  const id = androidIdentity();
  return (
    id.includes("huawei") ||
    id.includes("honor") ||
    id.includes("harmony") ||
    id.includes("openharmony")
  );
}

/** 低端机 / 小屏 / 虚拟机 / 老系统：自动降级粒子与光柱 */
export function detectLowPerfDevice(): boolean {
  const { width, height } = Dimensions.get("window");
  const scale = PixelRatio.get();
  const shortSide = Math.min(width, height);
  if (shortSide < 360) return true;
  if (width * height * scale < 900_000) return true;
  if (Platform.OS === "android" && scale < 2) return true;
  if (isEmulatorOrLegacyOs()) return true;
  return false;
}

export function isEmulatorOrLegacyOs(): boolean {
  if (Platform.OS === "android") {
    const version = typeof Platform.Version === "number" ? Platform.Version : parseInt(String(Platform.Version), 10);
    if (Number.isFinite(version) && version > 0 && version < 26) return true;
  }
  if (Platform.OS === "ios") {
    const version = typeof Platform.Version === "string" ? parseFloat(Platform.Version) : Number(Platform.Version);
    if (Number.isFinite(version) && version > 0 && version < 14) return true;
  }
  const brand = (Platform as { constants?: AndroidConstants }).constants;
  const model = androidIdentity();
  if (brand?.isTesting) return true;
  if (model.includes("sdk") || model.includes("emulator") || model.includes("simulator")) return true;
  return false;
}

export function resolveEmulatorDegradeLevel(): number {
  return isEmulatorOrLegacyOs() ? 1 : 0;
}
