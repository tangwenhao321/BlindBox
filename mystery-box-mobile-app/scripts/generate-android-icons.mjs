/**
 * Regenerate android/app/src/main/res/mipmap-* from assets/icon.png (Expo adaptive icon).
 * Usage: node scripts/generate-android-icons.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { setIconAsync } from "@expo/prebuild-config/build/plugins/icons/withAndroidIcons.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const icon = path.join(root, "assets/icon.png");

await setIconAsync(root, {
  icon,
  backgroundColor: "#6B4EFF",
  isAdaptive: true,
});

console.log("Android launcher icons updated from", icon);
