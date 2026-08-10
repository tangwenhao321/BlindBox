const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    const status = await exec(conn, "systemctl status mystery-box-test --no-pager -l | head -30");
    console.log(status.out);

    const env = await exec(conn, "grep -E 'SPRING|TEST_DB|APP_ANDROID' /opt/mystery-box-test/.env || true");
    console.log("\n.env:\n", env.out);

    const err = await exec(conn, "tail -n 40 /opt/mystery-box-test/logs/backend.err.log 2>/dev/null || true");
    console.log("\nerr.log:\n", err.out);

    const log = await exec(conn, "tail -n 20 /opt/mystery-box-test/logs/backend.log 2>/dev/null || true");
    console.log("\nbackend.log:\n", log.out);
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.out || e.message);
  process.exit(1);
});
