import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../mystery-box-backend/data/uploads/boxes",
);
fs.mkdirSync(out, { recursive: true });

async function writeJpeg(fileName, svg, width, height) {
  const file = path.join(out, fileName);
  await sharp(Buffer.from(svg)).resize(width, height).jpeg({ quality: 88 }).toFile(file);
  console.log("wrote", file);
}

const boxes = [
  { id: "mb-set-01", bg: "#2A2420", accent: "#C4A574", ribbon: "#8B4513", label: "夜柜 · 01", sub: "限定套系" },
  { id: "mb-set-02", bg: "#1E2430", accent: "#7EB6FF", ribbon: "#3D5A80", label: "夜柜 · 02", sub: "星河系列" },
  { id: "mb-set-03", bg: "#2A1A28", accent: "#E8A0BF", ribbon: "#6B2D5B", label: "夜柜 · 03", sub: "雾紫系列" },
];

for (const c of boxes) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c.bg}"/>
        <stop offset="100%" stop-color="#0F0E0C"/>
      </linearGradient>
    </defs>
    <rect width="800" height="800" fill="url(#g)"/>
    <rect x="70" y="90" width="660" height="620" rx="42" fill="#161310" stroke="${c.accent}" stroke-width="6"/>
    <rect x="160" y="180" width="480" height="320" rx="28" fill="${c.ribbon}" opacity="0.55"/>
    <circle cx="400" cy="320" r="78" fill="${c.accent}" opacity="0.4"/>
    <rect x="250" y="250" width="300" height="180" rx="22" fill="none" stroke="${c.accent}" stroke-width="5"/>
    <text x="400" y="560" text-anchor="middle" font-size="48" font-family="Arial, sans-serif" fill="${c.accent}" font-weight="700">${c.label}</text>
    <text x="400" y="620" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#F7F3EA" opacity="0.85">${c.sub}</text>
  </svg>`;
  await writeJpeg(`${c.id}.jpg`, svg, 800, 800);
}

const products = [
  { id: "prd-seed-g1", bg: "#243028", accent: "#9CCC65", label: "普通赏", mark: "A" },
  { id: "prd-seed-h1", bg: "#2A2438", accent: "#B39DDB", label: "隐藏赏", mark: "H" },
  { id: "prd-seed-l1", bg: "#3A2418", accent: "#FFD54F", label: "传说赏", mark: "L" },
];

for (const p of products) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="800" height="800" fill="${p.bg}"/>
    <circle cx="400" cy="340" r="160" fill="${p.accent}" opacity="0.28"/>
    <circle cx="400" cy="340" r="100" fill="none" stroke="${p.accent}" stroke-width="8"/>
    <text x="400" y="360" text-anchor="middle" font-size="96" font-family="Arial, sans-serif" fill="${p.accent}" font-weight="800">${p.mark}</text>
    <text x="400" y="560" text-anchor="middle" font-size="40" font-family="Arial, sans-serif" fill="#F7F3EA" font-weight="700">${p.label}</text>
  </svg>`;
  await writeJpeg(`${p.id}.jpg`, svg, 800, 800);
}

const banners = [
  {
    id: "banner-01",
    bg1: "#1A1410",
    bg2: "#3D2E22",
    accent: "#C4A574",
    title: "开箱指南",
    sub: "随时开盒 · 轻松上手",
  },
  {
    id: "banner-02",
    bg1: "#121826",
    bg2: "#24344A",
    accent: "#7EB6FF",
    title: "概率公示",
    sub: "透明抽赏 · 看得见",
  },
  {
    id: "banner-03",
    bg1: "#24101C",
    bg2: "#3A1E2E",
    accent: "#E8A0BF",
    title: "限定上新",
    sub: "本周热门盲盒",
  },
];

for (const b of banners) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${b.bg1}"/>
        <stop offset="100%" stop-color="${b.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="600" fill="url(#bg)"/>
    <circle cx="980" cy="180" r="160" fill="${b.accent}" opacity="0.18"/>
    <circle cx="860" cy="420" r="120" fill="${b.accent}" opacity="0.12"/>
    <rect x="72" y="360" width="220" height="10" rx="5" fill="${b.accent}"/>
    <text x="72" y="250" font-size="72" font-family="Arial, sans-serif" fill="#F7F3EA" font-weight="800">${b.title}</text>
    <text x="72" y="320" font-size="34" font-family="Arial, sans-serif" fill="${b.accent}" font-weight="600">${b.sub}</text>
  </svg>`;
  await writeJpeg(`${b.id}.jpg`, svg, 1200, 600);
}

console.log("done");
