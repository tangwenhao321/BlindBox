const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const { connect, exec, upload } = require("./ssh-remote");

const ROOT = path.join(__dirname, "..");
const srcArchive = path.join(os.tmpdir(), "mystery-box-backend-src.tar.gz");

async function main() {
  console.log("=== Pack backend source ===");
  execSync(
    `tar --exclude="mystery-box-backend/target" -czf "${srcArchive}" mystery-box-backend scripts/deploy-test-server.sh`,
    { cwd: ROOT, stdio: "inherit", shell: true },
  );

  const conn = await connect();
  try {
    console.log("=== Upload backend source ===");
    await upload(conn, srcArchive, "/tmp/mystery-box-backend-src.tar.gz");
    await exec(
      conn,
      "mkdir -p /opt/mystery-box-test/src && tar -xzf /tmp/mystery-box-backend-src.tar.gz -C /opt/mystery-box-test/src",
    );

    console.log("=== Remote Maven build ===");
    await exec(conn, "cd /opt/mystery-box-test/src/mystery-box-backend && mvn -DskipTests clean package -q");
    await exec(
      conn,
      "cp /opt/mystery-box-test/src/mystery-box-backend/target/mystery-box-backend-1.0-SNAPSHOT.jar /opt/mystery-box-test/releases/mystery-box-backend.jar",
    );

    const verify = await exec(
      conn,
      "unzip -t /opt/mystery-box-test/releases/mystery-box-backend.jar >/dev/null 2>&1 && echo JAR_OK || (file /opt/mystery-box-test/releases/mystery-box-backend.jar; echo JAR_BAD)",
    );
    console.log("Verify:", verify.out.trim());
    if (!verify.out.includes("JAR_OK")) {
      throw new Error("Remote build produced invalid JAR");
    }

    await exec(
      conn,
      `grep -q '^APP_ANDROID_VERSION_CODE=' /opt/mystery-box-test/.env || echo 'APP_ANDROID_VERSION_CODE=6' >> /opt/mystery-box-test/.env`,
    );

    console.log("=== Restart service ===");
    await exec(conn, "cd /opt/mystery-box-test/src && bash scripts/deploy-test-server.sh deploy-only");

    const health = await exec(conn, "curl -sf http://127.0.0.1:9913/actuator/health");
    console.log("Health:", health.out.trim());

    const update = await exec(
      conn,
      "curl -sf 'http://127.0.0.1:9920/test-api/front/app/update-check?platform=android&versionCode=5&channel=test'",
    );
    console.log("Update-check:", update.out.trim());
    console.log("\nRemote backend build + deploy OK");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.out || e.message);
  process.exit(1);
});
