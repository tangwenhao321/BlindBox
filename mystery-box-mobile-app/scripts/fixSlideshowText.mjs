import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const sql = `
UPDATE slideshow SET content='开箱指南' WHERE id='slide-seed-1';
UPDATE slideshow SET content='概率公示' WHERE id='slide-seed-2';
`;
const tmp = path.join(os.tmpdir(), "slide-fix.sql");
fs.writeFileSync(tmp, sql, "utf8");
execSync(`docker cp "${tmp}" mystery-box-mysql:/tmp/slide.sql`);
execSync(
  'docker exec mystery-box-mysql mysql -uroot -plocaldev --default-character-set=utf8mb4 mystery_box -e "source /tmp/slide.sql"',
  { stdio: "inherit" },
);
execSync('docker exec mystery-box-redis redis-cli -a localdev FLUSHDB', { stdio: "ignore" });
fs.unlinkSync(tmp);
console.log("slideshow content fixed");
