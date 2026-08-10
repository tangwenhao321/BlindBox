const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    const java = await exec(conn, "java -version 2>&1; /usr/bin/java -version 2>&1");
    console.log(java.out);

    const run = await exec(
      conn,
      "timeout 12 /usr/bin/java -jar /opt/mystery-box-test/releases/mystery-box-backend.jar --server.port=19913 2>&1 | head -40 || true",
    );
    console.log("Manual run:\n", run.out);

    const backup = await exec(
      conn,
      "ls -la /opt/mystery-box-test/releases/*.jar 2>/dev/null; systemctl is-active mystery-box-test",
    );
    console.log(backup.out);
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.out || e.message);
  process.exit(1);
});
