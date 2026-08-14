import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

/**
 * Executes the full blackbox catalog automation runner (6913 cases)
 * and asserts zero failures.
 */
describe("full catalog automation execution", () => {
  it("runs all classified cases with zero failures", () => {
    const script = path.resolve(
      __dirname,
      "../../../docs/TEST_CASES/AUTOMATION/execute-all-cases.js"
    );
    const r = spawnSync(process.execPath, [script], { encoding: "utf8" });
    const latest = path.resolve(
      __dirname,
      "../../../docs/TEST_CASES/AUTOMATION/reports/full-run-latest.json"
    );
    expect(fs.existsSync(latest), `missing report; stderr=${r.stderr}`).toBe(true);
    const summary = JSON.parse(fs.readFileSync(latest, "utf8")).summary;
    expect(summary.total).toBeGreaterThan(6000);
    expect(summary.fail, JSON.stringify(summary.failSamples || [], null, 2)).toBe(0);
    expect(r.status, r.stdout + r.stderr).toBe(0);
  }, 120_000);
});
