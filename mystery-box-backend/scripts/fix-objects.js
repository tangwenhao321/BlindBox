const fs = require("fs");
const path = require("path");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (p.endsWith(".java")) acc.push(p);
  }
  return acc;
}

const root =
  "D:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-backend/src";
let n = 0;

for (const f of walk(root)) {
  let c = fs.readFileSync(f, "utf8");
  const o = c;

  c = c.replace(/^import\s*;\s*\r?\n/gm, "");

  const usesJimmerCreate = /Immutables\.create[A-Z]/.test(c);
  const usesUtilStyle =
    /Immutables\.(hashCode|equals|toString|requireNonNull)\(/.test(c);

  if (usesUtilStyle && !usesJimmerCreate) {
    c = c.replace(
      /Immutables\.(hashCode|equals|toString|requireNonNull)/g,
      "Objects.$1"
    );
    c = c.replace(
      /import io\.github\.qifan777\.server\.Immutables;\r?\n/g,
      ""
    );
    if (!c.includes("import java.util.Objects;")) {
      c = c.replace(/^(package [^;]+;)/m, "$1\n\nimport java.util.Objects;");
    }
  }

  if (c !== o) {
    fs.writeFileSync(f, c);
    n++;
    console.log("fix", path.relative(root, f));
  }
}
console.log("fixed", n);
