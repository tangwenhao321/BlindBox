import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconSrc = path.join(root, "assets/icon.png");
const res = path.join(root, "android/app/src/main/res");

const mipmapSizes = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};
const launcherSizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};
const splashSizes = {
  "drawable-mdpi": 200,
  "drawable-hdpi": 300,
  "drawable-xhdpi": 400,
  "drawable-xxhdpi": 600,
  "drawable-xxxhdpi": 800,
};
const notifSizes = {
  "drawable-mdpi": 24,
  "drawable-hdpi": 36,
  "drawable-xhdpi": 48,
  "drawable-xxhdpi": 72,
  "drawable-xxxhdpi": 96,
};

async function makeForeground(size) {
  const inset = Math.round(size * 0.12);
  const inner = size - inset * 2;
  const resized = await sharp(iconSrc).resize(inner, inner, { fit: "cover" }).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 20, g: 17, b: 15, alpha: 1 },
    },
  })
    .composite([{ input: resized, left: inset, top: inset }])
    .webp({ quality: 92 })
    .toBuffer();
}

async function makeLauncher(size) {
  return sharp(iconSrc).resize(size, size, { fit: "cover" }).webp({ quality: 92 }).toBuffer();
}

async function makeSplash(size) {
  const logo = Math.round(size * 0.72);
  const resized = await sharp(iconSrc).resize(logo, logo, { fit: "cover" }).png().toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 20, g: 17, b: 15, alpha: 1 },
    },
  })
    .composite([
      {
        input: resized,
        left: Math.round((size - logo) / 2),
        top: Math.round((size - logo) / 2),
      },
    ])
    .png()
    .toBuffer();
}

function drawNotifSvg(size) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
  <path fill="#ffffff" d="M9 7h30v4H9zm2 4h26v30H11zm3 3h9v24h-9zm12 0h11v24H26z"/>
  <rect x="33" y="22" width="2.5" height="5" rx="1.2" fill="#ffffff"/>
</svg>`);
}

async function makeNotif(size) {
  return sharp(drawNotifSvg(size)).resize(size, size).png().toBuffer();
}

for (const [dir, size] of Object.entries(mipmapSizes)) {
  fs.writeFileSync(path.join(res, dir, "ic_launcher_foreground.webp"), await makeForeground(size));
}
for (const [dir, size] of Object.entries(launcherSizes)) {
  const buf = await makeLauncher(size);
  fs.writeFileSync(path.join(res, dir, "ic_launcher.webp"), buf);
  fs.writeFileSync(path.join(res, dir, "ic_launcher_round.webp"), buf);
}
for (const [dir, size] of Object.entries(splashSizes)) {
  fs.writeFileSync(path.join(res, dir, "splashscreen_logo.png"), await makeSplash(size));
}
for (const [dir, size] of Object.entries(notifSizes)) {
  fs.writeFileSync(path.join(res, dir, "notification_icon.png"), await makeNotif(size));
}

const notifAsset = await makeNotif(96);
fs.writeFileSync(path.join(root, "assets/notification-icon.png"), notifAsset);
console.log("Synced night-cabinet launcher / splash / notification icons");
