/**
 * Reveal FPS collector for PERF_LAB_DEVICE=1.
 *
 * Modes:
 * - stub (default): validates budget env and exits 0
 * - file: read PERF_FPS_SAMPLE_FILE JSON { "avgFps": number, "p05Fps"?: number }
 * - require: PERF_REQUIRE_REAL=1 fails stub mode (CI device farm)
 */
const fs = require("fs");

const minFps = Number(process.env.PERF_MIN_FPS || 45);
const sampleFile = process.env.PERF_FPS_SAMPLE_FILE || "";
const requireReal = process.env.PERF_REQUIRE_REAL === "1";

function fail(msg) {
  console.error(JSON.stringify({ ok: false, minFps, error: msg }));
  process.exit(1);
}

if (sampleFile) {
  if (!fs.existsSync(sampleFile)) fail(`missing sample file: ${sampleFile}`);
  let sample;
  try {
    sample = JSON.parse(fs.readFileSync(sampleFile, "utf8"));
  } catch (e) {
    fail(`invalid JSON: ${e.message}`);
  }
  const avg = Number(sample.avgFps);
  const p05 = sample.p05Fps == null ? avg : Number(sample.p05Fps);
  if (!Number.isFinite(avg) || !Number.isFinite(p05)) fail("avgFps/p05Fps must be numbers");
  if (avg < minFps || p05 < minFps * 0.85) {
    fail(`fps below budget avg=${avg} p05=${p05} min=${minFps}`);
  }
  console.log(JSON.stringify({ ok: true, mode: "file", avgFps: avg, p05Fps: p05, minFps }));
  process.exit(0);
}

if (requireReal) {
  fail("PERF_REQUIRE_REAL=1 but no PERF_FPS_SAMPLE_FILE provided");
}

console.log(JSON.stringify({ ok: true, mode: "stub", minFps, note: "set PERF_FPS_SAMPLE_FILE for real gate" }));
process.exit(0);
