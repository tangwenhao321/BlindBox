import fs from "node:fs";
import path from "node:path";

const i18nDir = path.resolve("src/i18n");

for (const lang of ["zh-CN", "en-US"]) {
  const dir = path.join(i18nDir, "locales", lang);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const merged = {};
  for (const file of files) {
    const mod = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    Object.assign(merged, mod);
  }
  fs.writeFileSync(path.join(i18nDir, `${lang}.json`), `${JSON.stringify(merged, null, 2)}\n`);
}

console.log("exported split locale modules to src/i18n/{zh-CN,en-US}.json (optional backup)");
