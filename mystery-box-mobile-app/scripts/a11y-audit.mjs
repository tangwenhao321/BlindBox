import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { readdirSync, readFileSync, statSync } from "node:fs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "..", "src");
const TARGET_DIRS = [
  "components/home",
  "components/detail",
  "components/SettingsView.tsx",
  "components/ui/OpenBoxRevealOverlay.tsx",
  "components/ui/RevealPrizeCard.tsx",
  "components/OrderPrizeCard.tsx",
];

const RTL_PATTERN = /\bmargin(Left|Right)\s*:/g;

function collectFiles(dirOrFile, acc = []) {
  const full = join(SRC, dirOrFile);
  try {
    const stat = statSync(full);
    if (stat.isFile()) {
      acc.push(full);
      return acc;
    }
    for (const entry of readdirSync(full, { withFileTypes: true })) {
      if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        acc.push(join(full, entry.name));
      }
    }
  } catch {
    // ignore missing paths
  }
  return acc;
}

const files = TARGET_DIRS.flatMap((entry) => collectFiles(entry));
const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const matches = [...content.matchAll(RTL_PATTERN)];
  if (matches.length) {
    violations.push(`${relative(join(ROOT, ".."), file)} (${matches.length} marginLeft/Right)`);
  }
}

if (violations.length) {
  console.error("a11y RTL audit failed — use marginStart/marginEnd or gap instead:\n");
  violations.forEach((line) => console.error(`  - ${line}`));
  process.exit(1);
}

console.log(`a11y RTL audit passed (${files.length} files checked)`);
