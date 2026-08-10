const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const bundle = path.join(
  __dirname,
  "..",
  "mystery-box-mobile-app",
  "android",
  "app",
  "build",
  "intermediates",
  "assets",
  "debug",
  "mergeDebugAssets",
  "index.android.bundle",
);

function check() {
  if (!fs.existsSync(bundle)) return { ok: false, reason: "bundle missing" };
  const s = fs.readFileSync(bundle, "utf8");
  const has9920 = s.includes(":9920");
  const hasOld80 = s.includes("http://120.26.181.145/test-api");
  return { ok: hasOld80 && !has9920, has9920, hasOld80 };
}

const mobile = path.join(__dirname, "..", "mystery-box-mobile-app");
const envTest = path.join(mobile, ".env.test");
const env = path.join(mobile, ".env");
fs.copyFileSync(envTest, env);

console.log("=== Generate reveal sounds ===");
execSync("node scripts/generateRevealSounds.mjs", { cwd: mobile, stdio: "inherit", shell: true });

console.log("=== Rebuild test APK JS bundle + assembleDebug ===");
const android = path.join(mobile, "android");
const bundleDirs = [
  path.join(android, "app", "build", "generated", "assets"),
  path.join(android, "app", "build", "intermediates", "assets"),
];
for (const d of bundleDirs) {
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
}
execSync("gradlew.bat :app:createBundleDebugJsAndAssets :app:assembleDebug --no-daemon", {
  cwd: android,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    EXPO_PUBLIC_API_BASE_URL: "http://120.26.181.145/test-api",
    EXPO_PUBLIC_APP_VARIANT: "test",
    EXPO_PUBLIC_DEV_MOCK_OTP: "000000",
    EXPO_PUBLIC_PAYMENT_MODE: "mock",
    EXPO_PUBLIC_MOCK_PAYMENT: "true",
  },
});

const result = check();
console.log("Bundle check:", result);
if (!result.ok) {
  console.error("APK bundle still has wrong API URL — abort");
  process.exit(1);
}

const apkSrc = path.join(mobile, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const apkLocal = "D:\\软件安装\\mystery-box-test-harmony.apk";
fs.copyFileSync(apkSrc, apkLocal);
console.log("Local APK:", apkLocal);

execSync("node upload-test-apk.js", { cwd: __dirname, stdio: "inherit", shell: true });
