import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/i18n/locales");

for (const lang of ["zh-CN", "en-US"]) {
  const dir = path.join(root, lang);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const imports = files.map((file, index) => ({ varName: `m${index}`, file: file.replace(/\.json$/, "") }));
  const importLines = imports.map(({ varName, file }) => `import ${varName} from "./${file}.json";`).join("\n");
  const mergeArgs = imports.map(({ varName }) => varName).join(", ");
  const content = `import { mergeLocaleModules } from "../../mergeLocale";\n${importLines}\n\nexport default mergeLocaleModules(${mergeArgs}) as Record<string, unknown>;\n`;
  fs.writeFileSync(path.join(dir, "index.ts"), content);
}

console.log("locale index files generated");
