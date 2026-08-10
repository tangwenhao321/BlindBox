const fs = require("fs");
const path = require("path");
const os = require("os");
const { connect, exec, upload } = require("./ssh-remote");

const BASE = "http://120.26.181.145:9920/test-api";
const MOBILE = "13900000001";
const PASS = "Test@123456";

async function http(method, url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.token = token;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* */ }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 300) };
}

async function main() {
  console.log("=== 1. Server APK on disk ===");
  const conn = await connect();
  try {
    await exec(conn, "ls -lh /opt/mystery-box-test/releases/mystery-box-test.apk");
    await exec(conn, "md5sum /opt/mystery-box-test/releases/mystery-box-test.apk");
  } finally {
    conn.end();
  }

  console.log("\n=== 2. Download APK & inspect embedded API URL ===");
  const tmpApk = path.join(os.tmpdir(), "mystery-box-test-check.apk");
  const conn2 = await connect();
  try {
    await new Promise((resolve, reject) => {
      conn2.sftp((err, sftp) => {
        if (err) return reject(err);
        sftp.fastGet("/opt/mystery-box-test/releases/mystery-box-test.apk", tmpApk, (e) => (e ? reject(e) : resolve()));
      });
    });
  } finally {
    conn2.end();
  }
  const localApk = path.join(__dirname, "..", "mystery-box-mobile-app", "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  if (fs.existsSync(localApk)) {
    const { execSync } = require("child_process");
    const serverMd5 = execSync(`certutil -hashfile "${tmpApk}" MD5`, { encoding: "utf8" }).match(/([0-9a-f]{32})/i)?.[1];
    const localMd5 = execSync(`certutil -hashfile "${localApk}" MD5`, { encoding: "utf8" }).match(/([0-9a-f]{32})/i)?.[1];
    console.log("Server vs local APK MD5 match:", serverMd5 === localMd5, serverMd5, localMd5);
  }

  // unzip APK assets bundle
  const unzipDir = path.join(os.tmpdir(), "apk-check");
  fs.rmSync(unzipDir, { recursive: true, force: true });
  fs.mkdirSync(unzipDir, { recursive: true });
  require("child_process").execSync(
    `powershell -Command "Expand-Archive -Force -Path '${tmpApk.replace(/'/g, "''")}' -DestinationPath '${unzipDir.replace(/'/g, "''")}'"`,
    { stdio: "inherit", shell: true },
  ).catch?.(() => {});
  // APK is zip - use tar or powershell differently
  require("child_process").execSync(`powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${tmpApk.replace(/\\/g, "/")}', '${unzipDir.replace(/\\/g, "/")}')"`, { shell: true });
  const bundlePath = path.join(unzipDir, "assets", "index.android.bundle");
  if (fs.existsSync(bundlePath)) {
    const s = fs.readFileSync(bundlePath, "utf8");
    console.log("APK bundle has :9920", s.includes(":9920"));
    console.log("APK bundle has old 80 URL", s.includes("http://120.26.181.145/test-api"));
    const m = s.match(/http:\/\/120\.26\.181\.145[^"'\\s]*/g);
    console.log("URLs in APK:", [...new Set(m || [])].slice(0, 5));
  } else {
    console.log("Bundle not found in APK at", bundlePath);
    const assets = fs.readdirSync(path.join(unzipDir, "assets")).slice(0, 10);
    console.log("assets:", assets);
  }

  console.log("\n=== 3. App critical API flow (guest + logged in) ===");
  const guestBoxes = await http("POST", `${BASE}/front/mystery-box/query`, { pageNum: 1, pageSize: 10, query: {} });
  console.log("guest boxes", guestBoxes.status, guestBoxes.json?.code, guestBoxes.text.slice(0, 120));

  const login = await http("POST", `${BASE}/front/user/login`, { phone: MOBILE, password: PASS });
  const token = login.json?.result?.tokenValue;
  console.log("login", login.status, login.json?.code, token ? "token ok" : login.text);

  const tests = [
    ["home/summary", "GET", `${BASE}/front/home/summary`, null],
    ["mystery-box/query", "POST", `${BASE}/front/mystery-box/query`, { pageNum: 1, pageSize: 10, query: {} }],
    ["recommendation", "GET", `${BASE}/front/recommendation/mystery-box?limit=8`, null],
    ["slideshow", "GET", `${BASE}/front/slideshow/query?pageNum=1&pageSize=3`, null],
    ["user/info", "GET", `${BASE}/front/user/info`, null],
    ["orders/query", "POST", `${BASE}/front/mystery-box-order/query`, { pageNum: 1, pageSize: 1, query: {} }],
    ["addresses", "GET", `${BASE}/front/address/query`, null],
    ["warehouse/count", "GET", `${BASE}/front/warehouse/items/count`, null],
  ];
  for (const [name, method, url, body] of tests) {
    const r = await http(method, url, body, token);
    const ok = r.json?.code === 1 || (r.ok && !r.json?.code);
    console.log(`${ok ? "OK" : "FAIL"} ${name}`, r.status, r.json?.code ?? "-", r.json?.msg?.slice?.(0, 60) || r.text.slice(0, 80));
  }

  console.log("\n=== 4. Old broken URL (should NOT be API JSON) ===");
  const old = await fetch("http://120.26.181.145/test-api/front/home/summary");
  const oldText = await old.text();
  console.log("old80 status", old.status, "isHtml", oldText.includes("<html"), oldText.slice(0, 60));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
