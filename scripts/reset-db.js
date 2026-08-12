const { connect, exec } = require("./ssh-remote");
const { mysqlDocker, assertDropConfirmed } = require("./deploy-secrets");

async function main() {
  assertDropConfirmed();
  const conn = await connect();
  try {
    await exec(
      conn,
      mysqlDocker(
        `-e "DROP DATABASE IF EXISTS mystery_box_test; CREATE DATABASE mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"`,
      ),
    );
    await exec(conn, "systemctl restart mystery-box-test");
    await exec(conn, "sleep 60");
    await exec(conn, "curl -sf http://127.0.0.1:9913/actuator/health");
    await exec(conn, "curl -sf http://127.0.0.1:9920/test-api/actuator/health | head -c 300");
    console.log("\nDB reset + service OK");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  if (e.out) console.error(e.out.slice(-2000));
  process.exit(1);
});
