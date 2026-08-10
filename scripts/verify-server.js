const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    await exec(conn, "systemctl is-active mystery-box-test");
    await exec(
      conn,
      "docker exec ehpay-mysql mysql -uroot -p'Admin123#' -N -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='mystery_box_test'; SELECT COUNT(*) FROM flyway_schema_history WHERE success=0; SELECT COUNT(*) FROM mystery_box; SELECT COUNT(*) FROM ops_home_hot_box WHERE enabled=1; SELECT COUNT(*) FROM fragment_exchange_sku WHERE enabled=1; SELECT phone FROM user WHERE phone IN ('admin_test','13900000001');\" mystery_box_test",
    );
    await exec(conn, "ss -lntp | grep -E ':9913|:80 '");
    await exec(conn, "curl -sf http://127.0.0.1:9920/test-api/actuator/health | head -c 80");
    console.log("\nServer checks done");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
