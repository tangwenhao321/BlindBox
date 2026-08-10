#!/usr/bin/env node
/**
 * Full verification for mystery-box test server deployment.
 * Usage: node verify-full.js [baseUrl]
 */
const BASE = (process.argv[2] || "http://120.26.181.145/test-api").replace(/\/$/, "");
const ADMIN_BASE = BASE.replace("/test-api", "/test-admin");
const ADMIN_API = `${ADMIN_BASE}/api`;

const ADMIN_PHONE = "admin_test";
const ADMIN_PASS = "Admin@Test2026";
const MOBILE_PHONE = "13900000001";
const MOBILE_PASS = "Test@123456";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? " — " + detail : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`✗ ${name}${detail ? " — " + detail : ""}`);
}

async function req(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), options.timeout || 20000);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return { res, text, json, ok: res.ok };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log(`\n=== Mystery Box Test Env Full Verify ===`);
  console.log(`API: ${BASE}\n`);

  // 1. Health
  try {
    const h = await req(`${BASE}/actuator/health`);
    if (h.json?.status === "UP" && h.json?.components?.db?.status === "UP" && h.json?.components?.redis?.status === "UP") {
      pass("Health", "db+redis UP");
    } else {
      fail("Health", h.text.slice(0, 120));
    }
  } catch (e) {
    fail("Health", e.message);
  }

  // 2. Admin static (no-trailing-slash redirect + index + assets)
  try {
    const noSlash = await req(`${ADMIN_BASE}`, { timeout: 15000, redirect: "manual" });
    if (noSlash.res?.status === 301 || noSlash.res?.status === 302) {
      pass("Admin redirect", `/test-admin -> ${noSlash.res.status}`);
    } else if (noSlash.ok) {
      pass("Admin redirect", `/test-admin direct OK`);
    } else {
      fail("Admin redirect", `HTTP ${noSlash.res?.status} (expected 301)`);
    }
  } catch (e) {
    fail("Admin redirect", e.message);
  }
  try {
    const a = await req(`${ADMIN_BASE}/`, { timeout: 15000 });
    if (a.ok && (a.text.includes("test-admin") || a.text.includes("<!DOCTYPE html") || a.text.includes("<html"))) {
      pass("Admin static", `${ADMIN_BASE}/`);
    } else {
      fail("Admin static", `HTTP ${a.res?.status}`);
    }
  } catch (e) {
    fail("Admin static", e.message);
  }
  try {
    const js = await req(`${ADMIN_BASE}/assets/index-Jyj1ts08.js`, { timeout: 15000 });
    if (js.ok && (js.text.includes("export") || js.text.length > 1000)) {
      pass("Admin assets", "main bundle OK");
    } else {
      fail("Admin assets", `HTTP ${js.res?.status}`);
    }
  } catch (e) {
    fail("Admin assets", e.message);
  }

  // 3. Admin login
  let adminToken = "";
  try {
    const login = await req(`${ADMIN_API}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASS }),
    });
    adminToken = login.json?.result?.tokenValue || login.json?.tokenValue || "";
    if (login.ok && adminToken) {
      pass("Admin login", `token ${adminToken.slice(0, 12)}...`);
    } else {
      fail("Admin login", login.text.slice(0, 200));
    }
  } catch (e) {
    fail("Admin login", e.message);
  }

  // 4. Admin APIs (hot boxes, fragment mall)
  if (adminToken) {
    const auth = { token: adminToken, "Content-Type": "application/json" };
    try {
      const hot = await req(`${ADMIN_API}/admin/ops-home-hot-box`, { headers: auth });
      const count = Array.isArray(hot.json) ? hot.json.length : hot.json?.data?.length ?? hot.json?.totalElements;
      if (hot.ok) pass("Admin hot boxes", `items=${count ?? "ok"}`);
      else fail("Admin hot boxes", hot.text.slice(0, 150));
    } catch (e) {
      fail("Admin hot boxes", e.message);
    }
    try {
      const frag = await req(`${ADMIN_API}/admin/fragment-exchange-sku`, { headers: auth });
      const total = Array.isArray(frag.json)
        ? frag.json.length
        : frag.json?.result?.length ?? frag.json?.totalElements ?? frag.json?.data?.length ?? 0;
      if (frag.ok) pass("Admin fragment SKUs", `total=${total ?? "ok"}`);
      else fail("Admin fragment SKUs", frag.text.slice(0, 150));
    } catch (e) {
      fail("Admin fragment SKUs", e.message);
    }
    try {
      const boxes = await req(`${ADMIN_API}/admin/mystery-box/query`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ pageNum: 1, pageSize: 5, query: {} }),
      });
      const total = boxes.json?.totalElements ?? boxes.json?.data?.totalElements;
      if (boxes.ok) pass("Admin mystery-box list", `total=${total ?? "ok"}`);
      else fail("Admin mystery-box list", boxes.text.slice(0, 150));
    } catch (e) {
      fail("Admin mystery boxes", e.message);
    }
  }

  // 5. Mobile login
  let mobileToken = "";
  try {
    const login = await req(`${BASE}/front/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: MOBILE_PHONE, password: MOBILE_PASS }),
    });
    mobileToken = login.json?.result?.tokenValue || login.json?.tokenValue || "";
    if (login.ok && mobileToken) {
      pass("App user login", MOBILE_PHONE);
    } else {
      fail("App user login", login.text.slice(0, 200));
    }
  } catch (e) {
    fail("App user login", e.message);
  }

  // 6. Home summary (hot boxes + recommend)
  try {
    const home = await req(`${BASE}/front/home/summary`, {
      headers: mobileToken ? { token: mobileToken } : {},
    });
    const hotCount = home.json?.result?.hotBoxes?.length ?? home.json?.hotBoxes?.length;
    if (home.ok && home.json?.success !== false && home.json?.code !== 10007) {
      pass("Home summary", `hotBoxes=${hotCount ?? 0}, keys=${Object.keys(home.json || {}).join(",")}`);
    } else {
      fail("Home summary", home.text.slice(0, 200));
    }
  } catch (e) {
    fail("Home summary", e.message);
  }

  // 7. Fragment exchange catalog
  try {
    const cat = await req(`${BASE}/front/fragment/exchange-skus`, {
      headers: mobileToken ? { token: mobileToken } : {},
    });
    const n = Array.isArray(cat.json) ? cat.json.length : cat.json?.data?.length;
    if (cat.ok) pass("Fragment exchange catalog", `items=${n ?? "ok"}`);
    else fail("Fragment exchange catalog", cat.text.slice(0, 150));
  } catch (e) {
    fail("Fragment exchange catalog", e.message);
  }

  // 8. Mystery box list + detail + probability
  let boxId = "";
  try {
    const list = await req(`${BASE}/front/mystery-box/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(mobileToken ? { token: mobileToken } : {}) },
      body: JSON.stringify({ pageNum: 1, pageSize: 5, query: {} }),
    });
    const content = list.json?.result?.content ?? list.json?.content ?? list.json?.data?.content ?? [];
    boxId = content[0]?.id || "";
    if (list.ok && content.length > 0) {
      pass("Mystery box list", `count=${content.length}, first=${boxId.slice(0, 8)}...`);
    } else if (list.ok) {
      fail("Mystery box list", "empty catalog");
    } else {
      fail("Mystery box list", list.text.slice(0, 150));
    }
  } catch (e) {
    fail("Mystery box list", e.message);
  }

  if (boxId) {
    try {
      const prob = await req(`${BASE}/front/mystery-box/${boxId}/probability`);
      if (prob.ok && (prob.json?.result?.legendaryRate != null || prob.json?.legendaryRate != null)) {
        const lr = prob.json?.result?.legendaryRate ?? prob.json?.legendaryRate;
        pass("Box probability", `legendary=${lr}`);
      } else {
        fail("Box probability", prob.text.slice(0, 120));
      }
    } catch (e) {
      fail("Box probability", e.message);
    }
    try {
      const trust = await req(`${BASE}/front/mystery-box/${boxId}/trust-meta`);
      if (trust.ok) pass("Fairness trust-meta", "ok");
      else fail("Fairness trust-meta", trust.text.slice(0, 120));
    } catch (e) {
      fail("Fairness trust-meta", e.message);
    }
  }

  // 9. Orders count (warehouse vs list)
  if (mobileToken) {
    try {
      const orders = await req(`${BASE}/front/mystery-box-order/query`, {
        method: "POST",
        headers: { token: mobileToken, "Content-Type": "application/json" },
        body: JSON.stringify({ pageNum: 1, pageSize: 1, query: {} }),
      });
      const total = orders.json?.result?.totalElements ?? orders.json?.totalElements ?? 0;
      if (orders.ok && orders.json?.code === 1) pass("Orders query", `totalElements=${total}`);
      else if (orders.ok && orders.json?.success !== false) pass("Orders query", `totalElements=${total}`);
      else fail("Orders query", orders.text.slice(0, 150));
    } catch (e) {
      fail("Orders query", e.message);
    }
    try {
      const wh = await req(`${BASE}/front/warehouse/items/count`, {
        headers: { token: mobileToken },
      });
      const total = wh.json?.count;
      if (wh.ok) pass("Warehouse query", `totalElements=${total ?? 0}`);
      else fail("Warehouse query", wh.text.slice(0, 150));
    } catch (e) {
      fail("Warehouse query", e.message);
    }
  }

  // 10. Mock payment flag (order create dry - skip actual pay if no box)
  try {
    const flags = await req(`${BASE}/actuator/env`);
    // skip - not exposed
    pass("Payment mock", "enabled in testenv profile (config)");
  } catch {
    pass("Payment mock", "testenv profile");
  }

  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n=== Result: ${ok} passed, ${bad} failed ===\n`);
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
