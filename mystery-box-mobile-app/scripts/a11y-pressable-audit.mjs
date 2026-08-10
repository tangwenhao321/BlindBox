#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const COMPONENTS_DIR = join(ROOT, "src", "components");
const BASELINE_PATH = join(ROOT, "scripts", "a11y-pressable-baseline.txt");

const SKIP_FILES = new Set(["src/components/ui/OptimizedFlatList.tsx"]);

const baseline = new Set(
  existsSync(BASELINE_PATH)
    ? readFileSync(BASELINE_PATH, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [],
);

const offenders = [];

function walkTsx(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsx(full, files);
      continue;
    }
    if (entry.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

function scanFile(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, "/");
  if (SKIP_FILES.has(rel)) return;
  const content = readFileSync(filePath, "utf8");
  const pressableRegex = /<Pressable\b[\s\S]*?(?:\/>|<\/Pressable>)/g;
  let match;
  while ((match = pressableRegex.exec(content)) !== null) {
    const block = match[0];
    if (block.includes("accessibilityLabel=")) continue;
    if (block.includes("accessible={false}")) continue;
    const line = content.slice(0, match.index).split("\n").length;
    const key = `${rel}:${line}`;
    if (baseline.has(key)) continue;
    offenders.push({ file: rel, line });
  }
}

for (const file of walkTsx(COMPONENTS_DIR)) {
  scanFile(file);
}

if (offenders.length > 0) {
  console.error("Pressable components missing accessibilityLabel (not in baseline):");
  for (const item of offenders) {
    console.error(`  ${item.file}:${item.line}`);
  }
  process.exit(1);
}

console.log(
  `a11y pressable audit passed (${walkTsx(COMPONENTS_DIR).length} files, ${baseline.size} baseline entries)`,
);
