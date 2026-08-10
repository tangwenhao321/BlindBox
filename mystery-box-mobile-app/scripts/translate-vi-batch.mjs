/**
 * Batch-translate pending en strings to vi via MyMemory (free API).
 * Writes scripts/zh-vi-map.json keyed by exact en string.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pendingPath = path.join(root, "vi-leaves-pending.json");
const mapPath = path.join(root, "en-vi-map.json");

const pending = JSON.parse(fs.readFileSync(pendingPath, "utf8"));
const existing = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, "utf8")) : {};

const uniqueEn = [...new Set(pending.map((x) => x.en))].filter((en) => !existing[en]);

async function translate(en) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", en.slice(0, 500));
  url.searchParams.set("langpair", "en|vi");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.responseData?.translatedText;
  if (!text) throw new Error("no translation");
  return text;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let done = 0;
for (const en of uniqueEn) {
  try {
    existing[en] = await translate(en);
    done++;
    if (done % 10 === 0) {
      fs.writeFileSync(mapPath, `${JSON.stringify(existing, null, 2)}\n`);
      console.log(`saved ${done}/${uniqueEn.length}`);
    }
    await sleep(350);
  } catch (e) {
    console.error("fail", en.slice(0, 40), e.message);
    await sleep(2000);
  }
}

fs.writeFileSync(mapPath, `${JSON.stringify(existing, null, 2)}\n`);
console.log("done", Object.keys(existing).length);
