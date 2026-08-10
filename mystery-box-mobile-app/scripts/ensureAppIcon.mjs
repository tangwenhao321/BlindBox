import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../assets");
const outFile = path.join(outDir, "icon.png");

/** Only write placeholder when no real icon exists (avoid 1px invisible launcher icon). */
const MIN_ICON_BYTES = 4096;

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outFile) && fs.statSync(outFile).size >= MIN_ICON_BYTES) {
  console.log("icon ok:", outFile);
  process.exit(0);
}

console.warn("assets/icon.png missing or too small; add a 1024x1024 PNG before release builds.");
process.exit(0);
