const fs = require("fs");
const path = require("path");
const { connect, exec, upload } = require("./ssh-remote");
const { readGradleVersion, buildManifest } = require("./app-update-manifest");

const LOCAL_APK = path.join(
  __dirname,
  "..",
  "mystery-box-mobile-app",
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const REMOTE_APK = "/opt/mystery-box-test/releases/mystery-box-test.apk";
const REMOTE_MANIFEST = "/opt/mystery-box-test/releases/app-update.json";
const DOWNLOAD_URL = "http://120.26.181.145/test-downloads/mystery-box-test.apk";

const NGINX_SNIPPET = `
    location /test-downloads/ {
        alias /opt/mystery-box-test/releases/;
        autoindex off;
        default_type application/octet-stream;
        add_header Content-Disposition 'attachment';
        expires 1d;
    }
`;

async function ensureNginx(conn) {
  console.log("Nginx: use restore-ehpay-isolate.js or deploy-remote-node.js (port 9920)");
}

async function main() {
  if (!fs.existsSync(LOCAL_APK)) {
    throw new Error(`APK not found: ${LOCAL_APK}`);
  }
  const stat = fs.statSync(LOCAL_APK);
  console.log(`Local APK: ${LOCAL_APK} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
  const version = readGradleVersion();
  const manifest = buildManifest({
    versionCode: version.versionCode,
    versionName: version.versionName,
    downloadUrl: DOWNLOAD_URL,
    releaseNotes: "优化体验并修复已知问题",
  });
  const localManifest = path.join(__dirname, ".app-update.json");
  fs.writeFileSync(localManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const conn = await connect();
  try {
    await exec(conn, "mkdir -p /opt/mystery-box-test/releases");
    console.log("Uploading APK...");
    await upload(conn, LOCAL_APK, REMOTE_APK);
    console.log("Uploading app-update.json...");
    await upload(conn, localManifest, REMOTE_MANIFEST);
    await exec(conn, `ls -lh ${REMOTE_APK} ${REMOTE_MANIFEST}`);
    await ensureNginx(conn);
    await exec(
      conn,
      `curl -sfI http://127.0.0.1/test-downloads/mystery-box-test.apk | head -5`,
    );
    console.log(`\nDownload URL: ${DOWNLOAD_URL}`);
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-1500));
  process.exit(1);
});
