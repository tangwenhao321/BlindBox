import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const enDir = path.resolve(root, "../src/i18n/locales/en-US");
const zhDir = path.resolve(root, "../src/i18n/locales/zh-CN");

const same =
  "activity,ageGate,analyticsQueue,api,appLoading,boxDetailsData,boxDisplay,boxList,buyout,cabinet,catalog,ceremonyTier,commission,communityTopics,confirmDialog,currency,dataSync,drawPack,drawPackMath,drawQueue,effectProfile,errorBoundary,exchangeMall,fairness,favorites,feedback,homeBanner,infoPage,invite,ipTheme,leaderboard,mall,memberLevel,order,orderActions,orderUtils,oss,paymentError,playGuide,priceInput,privacyPage,prizeEffect,probability,profileActions,promotion,qualityFilter,qualityTier,revealA11y,revealShare,seriesStats,team,trust,upload,vip,vnpay,welfare,winRecord".split(
    ",",
  );

function leaves(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...leaves(v, p));
    else out.push([p, v]);
  }
  return out;
}

const all = [];
for (const ns of same) {
  const en = JSON.parse(fs.readFileSync(path.join(enDir, `${ns}.json`), "utf8"));
  const zh = JSON.parse(fs.readFileSync(path.join(zhDir, `${ns}.json`), "utf8"));
  const enLeaves = leaves(en[ns] ?? en);
  const zhLeaves = new Map(leaves(zh[ns] ?? zh));
  for (const [p, enVal] of enLeaves) {
    all.push({ ns, p, en: enVal, zh: zhLeaves.get(p) ?? "" });
  }
}
console.log("leaf count", all.length);
fs.writeFileSync(path.resolve(root, "vi-leaves-pending.json"), JSON.stringify(all, null, 2));
