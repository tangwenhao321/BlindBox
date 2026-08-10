const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    const health = await exec(conn, "curl -sf http://127.0.0.1:9913/actuator/health");
    console.log("Health:", health.out.trim());

    const update = await exec(
      conn,
      "curl -sf 'http://127.0.0.1:9920/test-api/front/app/update-check?platform=android&versionCode=5&channel=test'",
    );
    console.log("Update-check (vc=5):", update.out.trim());

    const manifest = await exec(conn, "curl -sf http://127.0.0.1/test-downloads/app-update.json");
    console.log("Static manifest:", manifest.out.trim());

    const logs = await exec(conn, "tail -n 5 /opt/mystery-box-test/logs/backend.err.log 2>/dev/null || true");
    console.log("Recent err log:\n", logs.out.trim());
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.out || e.message);
  process.exit(1);
});
