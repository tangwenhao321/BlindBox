const fs = require("fs");
const path = require("path");
const { connect, exec, upload } = require("./ssh-remote");
const { mysqlDocker, mysqlRootPassword, shellSingleQuote, assertDropConfirmed } = require("./deploy-secrets");

function findJar() {
  const dir = path.join(__dirname, "../mystery-box-backend/target");
  const name = fs.readdirSync(dir).find((f) => f.startsWith("mystery-box-backend-") && f.endsWith(".jar"));
  if (!name) throw new Error("Local JAR missing — run mvn package first");
  return path.join(dir, name);
}

async function main() {
  assertDropConfirmed();
  const jar = findJar();
  const sql = path.join(__dirname, "../database.sql");
  const dbPassQuoted = shellSingleQuote(mysqlRootPassword());
  const conn = await connect();
  try {
    await exec(conn, "systemctl stop mystery-box-test || true");
    await exec(
      conn,
      mysqlDocker(
        `-e "DROP DATABASE IF EXISTS mystery_box_test; CREATE DATABASE mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"`,
      ),
    );
    await upload(conn, sql, "/tmp/database.sql");
    await exec(conn, `${mysqlDocker("mystery_box_test", { interactive: true })} < /tmp/database.sql`);
    await exec(
      conn,
      `${mysqlDocker(
        `-N -e "ALTER DATABASE mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci; SELECT CONCAT('ALTER TABLE \\\`', table_name, '\\\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;') FROM information_schema.tables WHERE table_schema='mystery_box_test' AND table_type='BASE TABLE';" mystery_box_test`,
      )} > /tmp/fix-collate.sql`,
    );
    await exec(
      conn,
      `${mysqlDocker("mystery_box_test", { interactive: true })} < /tmp/fix-collate.sql`,
    );
    await upload(conn, jar, "/tmp/mystery-box-backend.jar");
    await exec(
      conn,
      "mv /tmp/mystery-box-backend.jar /opt/mystery-box-test/releases/mystery-box-backend.jar",
    );
    await upload(
      conn,
      path.join(__dirname, "../deploy/mystery-box-test.service"),
      "/etc/systemd/system/mystery-box-test.service",
    );
    await exec(
      conn,
      `grep TEST_DB_PASSWORD /opt/mystery-box-test/.env; sed -i 's/^TEST_DB_PASSWORD=.*/TEST_DB_PASSWORD=${dbPassQuoted}/' /opt/mystery-box-test/.env`,
    );
    await exec(conn, "systemctl daemon-reload && systemctl restart mystery-box-test");
    for (let i = 0; i < 24; i++) {
      const r = await exec(
        conn,
        "curl -sf http://127.0.0.1:9913/actuator/health && echo HEALTH_OK || echo HEALTH_WAIT",
      );
      if (r.out.includes("HEALTH_OK")) break;
      await exec(conn, "sleep 10");
    }
    await exec(conn, "curl -sf http://127.0.0.1:9920/test-api/actuator/health | head -c 300");
    await exec(conn, "systemctl is-active mystery-box-test");
    console.log("\ninit-test-db OK");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  if (e.out) console.error(e.out.slice(-2000));
  process.exit(1);
});
