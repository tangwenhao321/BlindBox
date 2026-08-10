import { Dimensions, PixelRatio, Platform } from "react-native";

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
  const brand = (Platform as { constants?: { Brand?: string; Model?: string; isTesting?: boolean } }).constants;
  const model = `${brand?.Brand ?? ""} ${brand?.Model ?? ""}`.toLowerCase();
  if (brand?.isTesting) return true;
  if (model.includes("sdk") || model.includes("emulator") || model.includes("simulator")) return true;
  return false;
}

export function resolveEmulatorDegradeLevel(): number {
  return isEmulatorOrLegacyOs() ? 1 : 0;
}
