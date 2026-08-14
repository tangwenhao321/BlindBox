const fs = require("fs");
const path = require("path");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const root =
  "D:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-backend/src/main/dto";

// Start from git-clean content expectation: re-read and fix only specification blocks
let n = 0;
for (const f of walk(root).filter((x) => x.endsWith(".dto"))) {
  let c = fs.readFileSync(f, "utf8");
  // Undo accidental bare (prop) left from bad replace, and normalize
  // Fix broken lines that are only "    (foo)" after mangled replace
  c = c.replace(/^(\s+)\((\w+)\)\s*$/gm, "$1associatedIdEq($2)");
  // Proper: inside specification blocks, id(x) -> associatedIdEq(x)
  const out = c.replace(/specification\s+\w+\s*\{[\s\S]*?\n\}/g, (block) =>
    block.replace(/(^|\s)id\(/gm, "$1associatedIdEq(")
  );
  if (out !== fs.readFileSync(f, "utf8")) {
    fs.writeFileSync(f, out);
    n++;
    console.log("fixed", path.relative(root, f));
  }
}
console.log("count", n);
