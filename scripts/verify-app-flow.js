/**
 * Full app-flow simulation (guest + logged-in paths the mobile app uses on home open).
 */
const BASE = "http://120.26.181.145/test-api";
const MOBILE = "13900000001";
const PASS = "Test@123456";

const results = [];
const pass = (n, d = "") => { results.push({ ok: true, n, d }); console.log(`✓ ${n}${d ? " — " + d : ""}`); };
const fail = (n, d = "") => { results.push({ ok: false, n, d }); console.log(`✗ ${n}${d ? " — " + d : ""}`); };

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.token = token;
  const url = `${BASE}${path}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* */ }
  return { res, json, text, url };
}

async function main() {
  console.log("\n=== App Flow E2E (9920) ===\n");

  // Guest home bootstrap (useAppCatalogFlow: !token && boxesCount===0)
  try {
    const boxes = await req("POST", "/front/mystery-box/query", { pageNum: 1, pageSize: 10, query: {} });
    if (boxes.json?.code === 1 && boxes.json.result?.content?.length > 0) {
      pass("Guest home boxes", `count=${boxes.json.result.content.length}`);
    } else fail("Guest home boxes", boxes.text.slice(0, 120));
  } catch (e) { fail("Guest home boxes", e.message); }

  try {
    const rec = await req("GET", "/front/recommendation/mystery-box?limit=8");
    if (rec.json?.code === 1) pass("Guest recommendation", `count=${rec.json.result?.length ?? 0}`);
    else fail("Guest recommendation", rec.text.slice(0, 120));
  } catch (e) { fail("Guest recommendation", e.message); }

  try {
    const mall = await req("POST", "/front/mystery-box/query", { pageNum: 1, pageSize: 10, query: {} });
    if (mall.json?.code === 1) pass("Guest mall catalog", `count=${mall.json.result?.content?.length ?? 0}`);
    else fail("Guest mall catalog", mall.text.slice(0, 120));
  } catch (e) { fail("Guest mall catalog", e.message); }

  try {
    const slides = await req("POST", "/front/slideshow/query", { pageNum: 1, pageSize: 3, query: {} });
    if (slides.json?.code === 1) pass("Guest slideshow", `count=${slides.json.result?.content?.length ?? 0}`);
    else fail("Guest slideshow", slides.text.slice(0, 120));
  } catch (e) { fail("Guest slideshow", e.message); }

  // Login + logged-in refresh (refreshHomeCatalog)
  let token = "";
  try {
    const login = await req("POST", "/front/user/login", { phone: MOBILE, password: PASS });
    token = login.json?.result?.tokenValue || "";
    if (token) pass("App login", token.slice(0, 12) + "...");
    else fail("App login", login.text.slice(0, 120));
  } catch (e) { fail("App login", e.message); }

  if (token) {
    const authed = [
      ["Auth home boxes", "POST", "/front/mystery-box/query", { pageNum: 1, pageSize: 10, query: {} }],
      ["Auth recommendation", "GET", "/front/recommendation/mystery-box?limit=8", null],
      ["Home summary", "GET", "/front/home/summary", null],
      ["User info", "GET", "/front/user/info", null],
      ["Addresses", "POST", "/front/address/query", { pageNum: 1, pageSize: 20, query: {} }],
      ["Orders", "POST", "/front/mystery-box-order/query", { pageNum: 1, pageSize: 1, query: {} }],
      ["Warehouse count", "GET", "/front/warehouse/items/count", null],
      ["Coupons", "POST", "/front/coupon-user-rel/query", { pageNum: 1, pageSize: 20, query: {} }],
      ["Fragment SKUs", "GET", "/front/fragment/exchange-skus", null],
      ["Notifications", "GET", "/front/notifications?limit=30", null],
      ["App update check", "GET", "/front/app/update-check?platform=android&versionCode=1", null],
    ];
    for (const [name, method, path, body] of authed) {
      try {
        const r = await req(method, path, body, token);
        if (r.json?.code === 1 || (r.res.ok && !r.json?.code)) pass(name, "ok");
        else fail(name, `${r.res.status} ${r.json?.msg || r.text.slice(0, 80)}`);
      } catch (e) { fail(name, e.message); }
    }
  }

  // APK bundle check (local build = server upload)
  const fs = require("fs");
  const bundle = "d:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-mobile-app/android/app/build/intermediates/assets/debug/mergeDebugAssets/index.android.bundle";
  if (fs.existsSync(bundle)) {
    const s = fs.readFileSync(bundle, "utf8");
    const url = "http://120.26.181.145/test-api";
    if (s.includes(url)) pass("APK embedded API URL", url);
    else fail("APK embedded API URL", "missing port-80 test-api URL");
  } else fail("APK bundle file", "not found");

  // Port reachability from public internet
  try {
    const h = await fetch(`${BASE}/actuator/health`, { signal: AbortSignal.timeout(8000) });
    const j = await h.json();
    if (j.status === "UP") pass("Public health 9920", "UP");
    else fail("Public health 9920", JSON.stringify(j).slice(0, 80));
  } catch (e) { fail("Public health 9920", e.message); }

  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n=== App Flow: ${ok} passed, ${bad} failed ===\n`);
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
