const path = require("path");
const fs = require("fs");
const { connect, upload, exec } = require("./ssh-remote");

const jarPath = path.join(__dirname, "..", "mystery-box-backend", "target", "mystery-box-backend-1.0-SNAPSHOT.jar");

async function main() {
  if (!fs.existsSync(jarPath)) {
    throw new Error(`JAR missing: ${jarPath}`);
  }
  const stat = fs.statSync(jarPath);
  console.log(`Local JAR: ${jarPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

  const conn = await connect();
  try {
    console.log("Stopping service before upload...");
    await exec(conn, "systemctl stop mystery-box-test.service || true");

    console.log("Uploading JAR...");
    const remoteJar = "/opt/mystery-box-test/releases/mystery-box-backend.jar";
    const remoteTmp = `${remoteJar}.uploading`;
    await upload(conn, jarPath, remoteTmp);
    await exec(conn, `mv -f ${remoteTmp} ${remoteJar}`);
    const ls = await exec(conn, "ls -lh /opt/mystery-box-test/releases/mystery-box-backend.jar");
    console.log(ls.out.trim());

    const verify = await exec(
      conn,
      "md5sum /opt/mystery-box-test/releases/mystery-box-backend.jar",
    );
    console.log("JAR md5:", verify.out.trim());

    await exec(
      conn,
      `grep -q '^APP_ANDROID_VERSION_CODE=' /opt/mystery-box-test/.env || echo 'APP_ANDROID_VERSION_CODE=6' >> /opt/mystery-box-test/.env`,
    );
    await exec(
      conn,
      `grep -q '^APP_ANDROID_VERSION_NAME=' /opt/mystery-box-test/.env || echo 'APP_ANDROID_VERSION_NAME=1.0.5' >> /opt/mystery-box-test/.env`,
    );

    await exec(conn, `chown mysterybox:mysterybox ${remoteJar} && chmod 644 ${remoteJar}`);

    console.log("Starting service...");
    await exec(conn, "systemctl start mystery-box-test.service");
    await exec(conn, "sleep 35");
    const health = await exec(conn, "curl -sf http://127.0.0.1:9913/actuator/health");
    console.log("Health:", health.out.trim());

    const update = await exec(
      conn,
      'curl -sf "http://127.0.0.1:9920/test-api/front/app/update-check?platform=android&versionCode=5&channel=test"',
    );
    console.log("Update-check (vc=5):", update.out.trim());
    console.log("\nBackend redeploy OK");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.out || e.message);
  process.exit(1);
});
