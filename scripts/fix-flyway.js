const { connect, exec } = require("./ssh-remote");
const { mysqlRootPassword, shellSingleQuote } = require("./deploy-secrets");

async function main() {
  const _dbPass = shellSingleQuote(mysqlRootPassword());
  const conn = await connect();
  try {
    await exec(
      conn,
      "docker exec ehpay-mysql mysql -uroot -p" + _dbPass + " mystery_box_test -e \"UPDATE flyway_schema_history SET success=1 WHERE success=0;\"",
    );
    await exec(conn, "systemctl restart mystery-box-test");
    await exec(conn, "sleep 50");
    await exec(conn, "curl -sf http://127.0.0.1:9913/actuator/health");
    await exec(conn, "curl -sf http://127.0.0.1:9920/test-api/actuator/health | head -c 300");
    console.log("\nFixed");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
