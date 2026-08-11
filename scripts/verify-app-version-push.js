/**
 * End-to-end check for the app version publish -> auto-push -> update-check flow.
 *
 * Walks the same path an operator takes in the admin panel and asserts the mobile-facing
 * endpoint reacts correctly at each step, then cleans up after itself.
 *
 * Usage:
 *   node scripts/verify-app-version-push.js
 *   BASE=http://localhost:9920 ADMIN_PHONE=admin ADMIN_PASS=secret node scripts/verify-app-version-push.js
 */
const BASE = (process.env.BASE || "http://120.26.181.145/test-api").replace(/\/$/, "");
const ADMIN_PHONE = process.env.ADMIN_PHONE || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "Admin@123456";
const PLATFORM = process.env.PLATFORM || "android";
// A deliberately huge version code so the probe never collides with a real release.
const PROBE_VERSION_CODE = Number(process.env.PROBE_VERSION_CODE || 990001);
const PROBE_CHANNEL = process.env.PROBE_CHANNEL || "verify-probe";

const results = [];
const pass = (n, d = "") => {
  results.push({ ok: true, n });
  console.log(`\u2713 ${n}${d ? " \u2014 " + d : ""}`);
};
const fail = (n, d = "") => {
  results.push({ ok: false, n });
  console.log(`\u2717 ${n}${d ? " \u2014 " + d : ""}`);
};

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.token = token;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON response */
  }
  return { res, json, text };
}

/** Backend wraps payloads as { code: 1, result }. */
function unwrap(r) {
  if (r.json && Object.prototype.hasOwnProperty.call(r.json, "result")) return r.json.result;
  return r.json;
}

async function updateCheck(versionCode, channel) {
  const query = `platform=${encodeURIComponent(PLATFORM)}&versionCode=${versionCode}&channel=${encodeURIComponent(channel)}`;
  const r = await req("GET", `/front/app/update-check?${query}`);
  return unwrap(r) || {};
}

async function main() {
  console.log(`\n=== App version publish + push E2E ===\nBASE: ${BASE}\n`);

  let token = "";
  try {
    const login = await req("POST", "/admin/auth/login", { phone: ADMIN_PHONE, password: ADMIN_PASS });
    token = unwrap(login)?.tokenValue || "";
    if (token) pass("Admin login", token.slice(0, 12) + "...");
    else fail("Admin login", `${login.res.status} ${login.json?.msg || login.text.slice(0, 120)}`);
  } catch (e) {
    fail("Admin login", e.message);
  }
  if (!token) {
    console.log("\nCannot continue without an admin token. Set ADMIN_PHONE / ADMIN_PASS.\n");
    process.exit(1);
  }

  let releaseId = "";
  try {
    const created = await req(
      "POST",
      "/admin/app-version",
      {
        platform: PLATFORM,
        channel: PROBE_CHANNEL,
        versionCode: PROBE_VERSION_CODE,
        versionName: `verify-${PROBE_VERSION_CODE}`,
        downloadUrl: "https://example.com/verify-probe.apk",
        forceUpdate: false,
        minSupportedVersionCode: 0,
        releaseNotes: "Automated verification probe. Safe to delete.",
        // Exercise publish-triggered auto-push (broadcast is async; we assert the PUBLISH log).
        autoPush: true,
      },
      token,
    );
    releaseId = unwrap(created)?.id || "";
    if (releaseId) pass("Create draft release", `id=${releaseId.slice(0, 8)} status=${unwrap(created)?.status}`);
    else fail("Create draft release", `${created.res.status} ${created.json?.msg || created.text.slice(0, 160)}`);
  } catch (e) {
    fail("Create draft release", e.message);
  }
  if (!releaseId) {
    summary();
    return;
  }

  try {
    const before = await updateCheck(PROBE_VERSION_CODE - 1, PROBE_CHANNEL);
    if (before.versionCode !== PROBE_VERSION_CODE) {
      pass("Draft is not served to clients", `hasUpdate=${before.hasUpdate}`);
    } else {
      fail("Draft is not served to clients", "draft leaked into update-check");
    }
  } catch (e) {
    fail("Draft is not served to clients", e.message);
  }

  try {
    const published = await req("POST", `/admin/app-version/${releaseId}/publish`, null, token);
    const status = unwrap(published)?.status;
    if (status === "PUBLISHED") pass("Publish release", `status=${status}`);
    else fail("Publish release", `${published.res.status} ${published.json?.msg || published.text.slice(0, 160)}`);
  } catch (e) {
    fail("Publish release", e.message);
  }

  // Publishing clears the resolve cache, but give an async broadcast a moment to settle.
  await new Promise((r) => setTimeout(r, 2000));

  try {
    const after = await updateCheck(PROBE_VERSION_CODE - 1, PROBE_CHANNEL);
    if (after.hasUpdate && after.versionCode === PROBE_VERSION_CODE) {
      pass("Older client is offered the update", `versionName=${after.versionName} force=${after.forceUpdate}`);
    } else {
      fail("Older client is offered the update", JSON.stringify(after).slice(0, 160));
    }
  } catch (e) {
    fail("Older client is offered the update", e.message);
  }

  try {
    const logs = await req("GET", `/admin/app-version/${releaseId}/push-log`, null, token);
    const rows = unwrap(logs) || [];
    const publishLog = Array.isArray(rows) ? rows.find((r) => r.triggerSource === "PUBLISH") : null;
    if (publishLog) {
      pass(
        "Publish auto-push recorded",
        `source=${publishLog.triggerSource} targets=${publishLog.targetCount}`,
      );
      if (Number(publishLog.targetCount) === 0) {
        console.log(
          "  ! warn: targetCount=0 — no Expo tokens registered; fan-out ran but reached nobody",
        );
      }
    } else {
      fail("Publish auto-push recorded", "no PUBLISH push-log entry");
    }
  } catch (e) {
    fail("Publish auto-push recorded", e.message);
  }

  try {
    const current = await updateCheck(PROBE_VERSION_CODE, PROBE_CHANNEL);
    if (!current.hasUpdate) pass("Up-to-date client is left alone");
    else fail("Up-to-date client is left alone", JSON.stringify(current).slice(0, 160));
  } catch (e) {
    fail("Up-to-date client is left alone", e.message);
  }

  try {
    const updated = await req(
      "PUT",
      `/admin/app-version/${releaseId}`,
      {
        platform: PLATFORM,
        channel: PROBE_CHANNEL,
        versionCode: PROBE_VERSION_CODE,
        versionName: `verify-${PROBE_VERSION_CODE}`,
        downloadUrl: "https://example.com/verify-probe.apk",
        forceUpdate: false,
        minSupportedVersionCode: PROBE_VERSION_CODE,
        releaseNotes: "Automated verification probe. Safe to delete.",
        autoPush: false,
      },
      token,
    );
    if (updated.res.ok) {
      const forced = await updateCheck(PROBE_VERSION_CODE - 1, PROBE_CHANNEL);
      if (forced.forceUpdate === true && forced.minSupportedVersionCode === PROBE_VERSION_CODE) {
        pass("minSupportedVersionCode forces the update");
      } else {
        fail("minSupportedVersionCode forces the update", JSON.stringify(forced).slice(0, 160));
      }
    } else {
      fail("minSupportedVersionCode forces the update", `${updated.res.status} ${updated.text.slice(0, 160)}`);
    }
  } catch (e) {
    fail("minSupportedVersionCode forces the update", e.message);
  }

  try {
    const pushed = await req("POST", `/admin/app-version/${releaseId}/push`, null, token);
    const count = unwrap(pushed);
    if (pushed.res.ok && typeof count === "number") {
      pass("Broadcast push executes", `targets=${count}`);
    } else {
      fail("Broadcast push executes", `${pushed.res.status} ${pushed.json?.msg || pushed.text.slice(0, 160)}`);
    }
  } catch (e) {
    fail("Broadcast push executes", e.message);
  }

  try {
    const logs = await req("GET", `/admin/app-version/${releaseId}/push-log`, null, token);
    const rows = unwrap(logs) || [];
    if (Array.isArray(rows) && rows.length > 0) {
      pass("Push is recorded in the audit log", `entries=${rows.length} source=${rows[0].triggerSource}`);
    } else {
      fail("Push is recorded in the audit log", "no log entries");
    }
  } catch (e) {
    fail("Push is recorded in the audit log", e.message);
  }

  try {
    const other = await updateCheck(PROBE_VERSION_CODE - 1, "production");
    if (other.versionCode !== PROBE_VERSION_CODE) {
      pass("Probe channel does not leak into production", `versionCode=${other.versionCode}`);
    } else {
      fail("Probe channel does not leak into production", "probe served to production clients");
    }
  } catch (e) {
    fail("Probe channel does not leak into production", e.message);
  }

  // Cleanup: archive so it stops being served, then delete the row.
  try {
    await req("POST", `/admin/app-version/${releaseId}/archive`, null, token);
    const removed = await req("DELETE", `/admin/app-version/${releaseId}`, null, token);
    if (removed.res.ok) pass("Cleanup probe release");
    else fail("Cleanup probe release", `${removed.res.status} ${removed.text.slice(0, 160)}`);
  } catch (e) {
    fail("Cleanup probe release", e.message);
  }

  try {
    const gone = await updateCheck(PROBE_VERSION_CODE - 1, PROBE_CHANNEL);
    if (gone.versionCode !== PROBE_VERSION_CODE) pass("Deleted release stops being served");
    else fail("Deleted release stops being served", "still served after delete");
  } catch (e) {
    fail("Deleted release stops being served", e.message);
  }

  summary();
}

function summary() {
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n=== App version push: ${ok} passed, ${bad} failed ===\n`);
  if (bad > 0) {
    console.log("Failed steps:");
    for (const r of results.filter((x) => !x.ok)) console.log(`  - ${r.n}`);
    console.log("");
  }
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
