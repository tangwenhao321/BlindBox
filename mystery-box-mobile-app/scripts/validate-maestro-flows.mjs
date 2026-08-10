#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FLOWS_DIR = join(ROOT, ".maestro", "flows");
const MIN_FLOWS = 38;
const PR_SMOKE = [
  "smoke.yaml",
  "login-smoke.yaml",
  "profile-smoke.yaml",
  "community-smoke.yaml",
  "deep-link-smoke.yaml",
  "warehouse-ship-smoke.yaml",
  "orders-smoke.yaml",
  "order-result-smoke.yaml",
  "reveal-share-spectator.yaml",
];

const yamlFiles = existsSync(FLOWS_DIR)
  ? readdirSync(FLOWS_DIR).filter((name) => name.endsWith(".yaml"))
  : [];

if (yamlFiles.length < MIN_FLOWS) {
  console.error(`Maestro flow files: ${yamlFiles.length} (minimum ${MIN_FLOWS})`);
  process.exit(1);
}

for (const flow of PR_SMOKE) {
  if (!existsSync(join(FLOWS_DIR, flow))) {
    console.error(`Missing PR smoke flow: ${flow}`);
    process.exit(1);
  }
}

console.log(`Maestro flow inventory OK (${yamlFiles.length} flows, PR smoke present)`);
