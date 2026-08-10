import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(root, "../src/i18n/locales");

function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      out[k] &&
      typeof out[k] === "object" &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function loadMerged(lang, extra = []) {
  const dir = path.join(localesDir, lang);
  let merged = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    merged = deepMerge(merged, JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
  }
  if (lang === "vi-VN") {
    merged = deepMerge(merged, JSON.parse(fs.readFileSync(path.join(dir, "index.ts"), "utf8")));
  }
  for (const rel of extra) {
    merged = deepMerge(merged, JSON.parse(fs.readFileSync(path.join(localesDir, rel), "utf8")));
  }
  return merged;
}

const viOverlays = [
  "vi-VN/boxDetails.json",
  "vi-VN/fullVi.json",
  "vi-VN/patch.json",
  "vi-VN/uxEnhancements.json",
  "vi-VN/marketVi.json",
  "vi-VN/address.json",
  "vi-VN/addressManage.json",
  "vi-VN/validation.json",
  "vi-VN/contact.json",
  "vi-VN/vnpay.json",
];

const en = loadMerged("en-US");
let vi = { ...en };
for (const f of viOverlays) {
  vi = deepMerge(vi, JSON.parse(fs.readFileSync(path.join(localesDir, f), "utf8")));
}

const namespaces = Object.keys(en).sort();
const same = [];
const diff = [];
for (const ns of namespaces) {
  if (JSON.stringify(en[ns]) === JSON.stringify(vi[ns])) same.push(ns);
  else diff.push(ns);
}
console.log("total", namespaces.length);
console.log("diff", diff.length);
console.log("same", same.length, same.join(", ") || "(none)");
