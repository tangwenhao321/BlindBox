const fs = require("fs");
const path = require("path");
const { connect, exec, upload } = require("./ssh-remote");

function findJar() {
  const dir = path.join(__dirname, "../mystery-box-backend/target");
  const name = fs.readdirSync(dir).find((f) => f.startsWith("mystery-box-backend-") && f.endsWith(".jar"));
  if (!name) throw new Error("Local JAR missing");
  return path.join(dir, name);
}

async function main() {
  const jar = findJar();
  const localSize = fs.statSync(jar).size;
  const conn = await connect();
  try {
    await exec(
      conn,
      "docker exec ehpay-mysql mysql -uroot -p'Admin123#' -e \"DROP DATABASE IF EXISTS mystery_box_test; CREATE DATABASE mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\"",
    );
    await upload(conn, jar, "/tmp/mystery-box-backend.jar");
    await exec(
      conn,
      `mv /tmp/mystery-box-backend.jar /opt/mystery-box-test/releases/mystery-box-backend.jar && ls -la /opt/mystery-box-test/releases/mystery-box-backend.jar`,
    );
    await exec(conn, `test $(stat -c%s /opt/mystery-box-test/releases/mystery-box-backend.jar) -eq ${localSize}`);
    await upload(
      conn,
      path.join(__dirname, "../deploy/mystery-box-test.service"),
      "/etc/systemd/system/mystery-box-test.service",
    );
    await exec(conn, "systemctl daemon-reload && systemctl restart mystery-box-test");
    await exec(conn, "sleep 120");
    await exec(conn, "curl -sf http://127.0.0.1:9913/actuator/health");
    await exec(conn, "curl -sf http://127.0.0.1:9920/test-api/actuator/health | head -c 300");
    console.log("\nOK");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  if (e.out) console.error(e.out.slice(-3000));
  process.exit(1);
});
