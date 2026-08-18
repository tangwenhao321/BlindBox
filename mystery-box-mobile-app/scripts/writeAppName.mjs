import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const stringsPath = path.join(root, "android/app/src/main/res/values/strings.xml");
const isTest = process.env.EXPO_PUBLIC_APP_VARIANT === "test";
const name = isTest ? "神秘盲盒测" : "神秘盲盒";
const body = `<resources>\n  <string name="app_name">${name}</string>\n</resources>\n`;
// BOM helps Windows aapt/gradle pick up Chinese correctly.
fs.writeFileSync(stringsPath, `\uFEFF${body}`, "utf8");
console.log(JSON.stringify(fs.readFileSync(stringsPath, "utf8")));
