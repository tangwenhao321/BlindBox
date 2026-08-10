const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    await exec(
      conn,
      "sudo -u mysterybox env $(grep -v '^#' /opt/mystery-box-test/.env | xargs) /usr/bin/java -jar /opt/mystery-box-test/releases/mystery-box-backend.jar --server.port=19914 2>&1 | head -25 & sleep 18; curl -sf http://127.0.0.1:19914/actuator/health || echo HEALTH_FAIL; pkill -f 'server.port=19914' || true",
    );
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.out || e.message);
  process.exit(1);
});
