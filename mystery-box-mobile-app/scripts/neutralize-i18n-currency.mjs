import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function neutralizeCurrencyStrings(value) {
  if (typeof value === "string") {
    return value
      .replace(/¥\{\{/g, "{{")
      .replace(/￥\{\{/g, "{{")
      .replace(/-¥\{\{/g, "-{{")
      .replace(/省¥\{\{/g, "省{{")
      .replace(/低至¥\{\{/g, "低至{{");
  }
  if (Array.isArray(value)) return value.map(neutralizeCurrencyStrings);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = neutralizeCurrencyStrings(v);
    return out;
  }
  return value;
}

const i18nDir = path.resolve("src/i18n");

for (const lang of ["zh-CN", "en-US"]) {
  const dir = path.join(i18nDir, "locales", lang);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    fs.writeFileSync(filePath, `${JSON.stringify(neutralizeCurrencyStrings(data), null, 2)}\n`);
  }
}

execSync("node scripts/generate-locale-index.mjs", { stdio: "inherit" });
console.log("neutralized currency placeholders in split locale modules");
