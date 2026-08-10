const fs = require("fs");
const p = "d:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-mobile-app/android/app/build/intermediates/assets/debug/mergeDebugAssets/index.android.bundle";
const s = fs.readFileSync(p, "utf8");
console.log("has 9920", s.includes(":9920"));
console.log("has old80", s.includes("http://120.26.181.145/test-api"));
console.log("has 9920 full", s.includes("http://120.26.181.145:9920/test-api"));
const idx = s.indexOf("120.26.181.145");
console.log("context", s.slice(Math.max(0, idx - 20), idx + 80));
