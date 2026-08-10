const { connect, exec, upload } = require("./ssh-remote");
const path = require("path");

async function main() {
  const conn = await connect();
  try {
    await upload(
      conn,
      path.join(__dirname, "../deploy/mystery-box-test.service"),
      "/etc/systemd/system/mystery-box-test.service",
    );
    await exec(conn, "systemctl daemon-reload && systemctl restart mystery-box-test");
    await exec(conn, "sleep 20 && curl -sf http://127.0.0.1:9913/actuator/health");
    await exec(conn, "curl -sf http://127.0.0.1:9920/test-api/actuator/health | head -c 200");
    console.log("\nService OK");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
