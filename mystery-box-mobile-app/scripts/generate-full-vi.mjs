/**
 * Builds vi-VN/fullVi.json from en-US namespaces + scripts/en-vi-map.json
 * Run: node scripts/generate-full-vi.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, "..");
const enDir = path.join(appRoot, "src/i18n/locales/en-US");
const outPath = path.join(appRoot, "src/i18n/locales/vi-VN/fullVi.json");
const mapPath = path.join(root, "en-vi-map.json");

const SAME_NS =
  "activity,ageGate,analyticsQueue,api,appLoading,boxDetailsData,boxDisplay,boxList,buyout,cabinet,catalog,ceremonyTier,commission,communityTopics,confirmDialog,currency,dataSync,drawPack,drawPackMath,drawQueue,effectProfile,errorBoundary,exchangeMall,fairness,favorites,feedback,homeBanner,infoPage,invite,ipTheme,leaderboard,mall,memberLevel,order,orderActions,orderUtils,oss,paymentError,playGuide,priceInput,privacyPage,prizeEffect,probability,profileActions,promotion,qualityFilter,qualityTier,revealA11y,revealShare,seriesStats,team,trust,upload,vip,vnpay,welfare,winRecord".split(
    ",",
  );

const EN_VI = JSON.parse(fs.readFileSync(mapPath, "utf8"));

/** Manual fixes for API / branding / typos from machine translation. */
const EN_VI_FIX = {
  盒: "Hộp",
  "Mystery Box Mall": "Cửa hàng Hộp Bí ẩn",
  "Không tim thấy đơn hàng": "Không tìm thấy đơn hàng",
  "Không tìm thấy dữ liệu {0}": "Không tìm thấy dữ liệu",
  "Tạm Hết Hàng": "Hết hàng",
  "Open ›": "Mở ›",
  "VNPay thanh toán": "Thanh toán VNPay",
  "{{name}}, {{price}}": "{{name}}, giá {{price}}",
  "Treasure Peerless": "Bảo vật vô song",
  "Full box": "Trọn hộp",
  "{{label}}, {{price}}{{best}}": "{{label}}, giá {{price}}{{best}}",
  "Hot IP": "IP nổi bật",
  "{{name}} (-{{amount}})": "{{name}} (giảm {{amount}})",
  "{{current}}/{{target}}": "{{current}}/{{target}} tiến độ",
};

function translate(en) {
  return EN_VI_FIX[en] ?? EN_VI[en] ?? en;
}

function setPath(obj, pathStr, value) {
  const parts = pathStr.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function leaves(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...leaves(v, p));
    else out.push([p, v]);
  }
  return out;
}

function buildNamespace(ns) {
  const enMod = JSON.parse(fs.readFileSync(path.join(enDir, `${ns}.json`), "utf8"));
  const enRoot = enMod[ns] ?? enMod;
  const viRoot = {};
  for (const [p, enVal] of leaves(enRoot)) {
    const enStr = String(enVal);
    let viVal = translate(enStr);
    if (viVal === enStr) {
      console.warn("missing translation:", ns, p, enStr.slice(0, 60));
      viVal = enStr;
    }
    setPath(viRoot, p, viVal);
  }
  return { [ns]: viRoot };
}

const fullVi = {};
for (const ns of SAME_NS) {
  Object.assign(fullVi, buildNamespace(ns));
}

fs.writeFileSync(outPath, `${JSON.stringify(fullVi, null, 2)}\n`);
console.log("Wrote", outPath);
