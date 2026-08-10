const fs = require("fs");
const path = require("path");
const { connect, exec, upload } = require("./ssh-remote");

async function main() {
  const sqlPath = path.join(
    __dirname,
    "../mystery-box-backend/src/main/resources/db/migration/V20260525_01__newcomer_referral_welfare.sql",
  );
  const conn = await connect();
  try {
    await exec(
      conn,
      "docker exec ehpay-mysql mysql -uroot -p'Admin123#' -e \"DROP DATABASE IF EXISTS mystery_box_test; CREATE DATABASE mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\"",
    );
    await exec(
      conn,
      "docker exec ehpay-mysql mysql -uroot -p'Admin123#' mystery_box_test < /opt/mystery-box-test/src/mystery-box-backend/src/main/resources/db/migration/V20260500_01__core_schema_baseline.sql",
    );
    await upload(conn, sqlPath, "/tmp/test-migration.sql");
    await exec(
      conn,
      "docker exec -i ehpay-mysql mysql -uroot -p'Admin123#' mystery_box_test < /tmp/test-migration.sql",
    );
    console.log("Migration SQL OK");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.errOut || e.out);
  process.exit(1);
});
