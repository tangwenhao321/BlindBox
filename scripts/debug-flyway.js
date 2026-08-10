const fs = require("fs");
const path = require("path");
const { connect, exec, upload } = require("./ssh-remote");

async function main() {
  const jar = fs.readdirSync(path.join(__dirname, "../mystery-box-backend/target"))
    .find((f) => f.startsWith("mystery-box-backend-") && f.endsWith(".jar"));
  const conn = await connect();
  try {
    await exec(conn, "systemctl stop mystery-box-test");
    await exec(
      conn,
      "docker exec ehpay-mysql mysql -uroot -p'Admin123#' -e \"DROP DATABASE IF EXISTS mystery_box_test; CREATE DATABASE mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;\"",
    );
    await upload(conn, path.join(__dirname, "../mystery-box-backend/target", jar), "/tmp/mb.jar");
    await exec(
      conn,
      "timeout 180 env SPRING_PROFILES_ACTIVE=testenv,private-test TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USERNAME=root TEST_DB_PASSWORD='Admin123#' REDIS_URL=redis://127.0.0.1:6379/1 UPLOAD_DIR=/opt/mystery-box-test/data/uploads-test /usr/bin/java -Xms512m -Xmx1024m -jar /tmp/mb.jar --server.port=9913 > /tmp/mb-flyway.log 2>&1; echo EXIT:$?; tail -80 /tmp/mb-flyway.log",
    );
    await exec(
      conn,
      "docker exec ehpay-mysql mysql -uroot -p'Admin123#' mystery_box_test -e 'SELECT version, success FROM flyway_schema_history ORDER BY installed_rank;'",
    );
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-4000));
  process.exit(1);
});
