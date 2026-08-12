#!/usr/bin/env node
/**
 * Deploy mystery-box test env to remote server (password SSH from Windows).
 * Usage: node deploy-remote-node.js [--first-run]
 *
 * Required env (no hardcoded secrets):
 *   SSH_HOST, SSH_PASSWORD
 *   TEST_DB_PASSWORD, ADMIN_ACTION_OTP, DEFAULT_ADMIN_PASSWORD
 * Optional:
 *   DEPLOY_HOST (defaults to SSH_HOST), SSH_USER, SSH_PORT
 *   TEST_DB_USERNAME (default root), PUBLIC_API_BASE_URL, PUBLIC_ADMIN_URL
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const { connect, exec, upload } = require("./ssh-remote");

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return String(v).trim();
}

const HOST = process.env.DEPLOY_HOST || process.env.SSH_HOST;
if (!HOST) {
  console.error("DEPLOY_HOST or SSH_HOST must be set.");
  process.exit(1);
}
const DB_PASSWORD = requireEnv("TEST_DB_PASSWORD");
const DB_USERNAME = process.env.TEST_DB_USERNAME || "root";
const ADMIN_OTP = requireEnv("ADMIN_ACTION_OTP");
const DEFAULT_ADMIN_PASSWORD = requireEnv("DEFAULT_ADMIN_PASSWORD");
const PUBLIC_API_BASE_URL =
  process.env.PUBLIC_API_BASE_URL || `http://${HOST}:9920/test-api`;
const PUBLIC_ADMIN_URL =
  process.env.PUBLIC_ADMIN_URL || `http://${HOST}:9920/test-admin`;

const ROOT = path.join(__dirname, "..");
const REMOTE_ROOT = "/opt/mystery-box-test";
const REMOTE_SRC = `${REMOTE_ROOT}/src`;
const TMP = os.tmpdir();

const args = process.argv.slice(2);
const firstRun = args.includes("--first-run");

const ENV_CONTENT = `DEPLOY_ROOT=${REMOTE_ROOT}
APP_USER=mysterybox
SPRING_PROFILES_ACTIVE=testenv,private-test
TEST_SERVER_PORT=9913
JAVA_OPTS="-Xms512m -Xmx1024m"
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USERNAME=${DB_USERNAME}
TEST_DB_PASSWORD="${DB_PASSWORD.replace(/"/g, '\\"')}"
REDIS_URL=redis://127.0.0.1:6379/1
VITE_API_PREFIX=/test-admin/api
VITE_BASE=/test-admin/
PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}
PUBLIC_ADMIN_URL=${PUBLIC_ADMIN_URL}
ADMIN_ACTION_OTP=${ADMIN_OTP}
DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD}
PAYMENT_MOCK_ENABLED=true
APP_ANDROID_VERSION_CODE=6
APP_ANDROID_VERSION_NAME=1.0.5
APP_ANDROID_DOWNLOAD_URL=http://${HOST}/test-downloads/mystery-box-test.apk
APP_ANDROID_RELEASE_NOTES=test build
UPLOAD_DIR=${REMOTE_ROOT}/data/uploads-test
`;

const PRIVATE_TEST_YML = `spring:
  datasource:
    username: ${DB_USERNAME}
    password: "${DB_PASSWORD.replace(/"/g, '\\"')}"

wx:
  miniapp:
    appid: test-appid
    secret: test-secret
  pay:
    app-id: test-app-id
    mch-id: test-mch-id
    apiv3-key: test-apiv3-key
    cert-serial-no: test-cert-serial
    notify-url: http://127.0.0.1:9913/front/mystery-box-order/notify/pay/wechat

oss:
  provider: local
  local:
    base-dir: ${REMOTE_ROOT}/data/uploads-test
    public-base-url: /uploads

sms:
  provider: none

tenant:
  map:
    key: test-tenant-map-key

security:
  admin-action-otp: "${ADMIN_OTP.replace(/"/g, '\\"')}"
  default-admin:
    enabled: true
    account: admin_test
    password: "${DEFAULT_ADMIN_PASSWORD.replace(/"/g, '\\"')}"
`;

const NGINX_SNIPPET = `# mystery-box test — isolated port 9920 (do NOT edit ehpay.conf)
server {
    listen 9920;
    server_name _;

    client_max_body_size 25m;

    location = /test-admin {
        return 301 /test-admin/;
    }

    location /test-api/ {
        rewrite ^/test-api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:9913;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /test-admin/api/ {
        rewrite ^/test-admin/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:9913;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /test-admin/ {
        alias ${REMOTE_ROOT}/releases/admin-dist/;
        index index.html;
        try_files $uri $uri/ /test-admin/index.html;
    }

    location = /test-admin/index.html {
        alias ${REMOTE_ROOT}/releases/admin-dist/index.html;
    }

    location /test-api/uploads/ {
        alias ${REMOTE_ROOT}/data/uploads-test/;
        expires 7d;
    }

    location /test-downloads/ {
        alias ${REMOTE_ROOT}/releases/;
        autoindex off;
        default_type application/octet-stream;
        add_header Content-Disposition 'attachment';
        expires 1d;
    }
}
`;

function runLocal(cmd, cwd = ROOT, env = process.env) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", shell: true, env: { ...process.env, ...env } });
}

function findJar() {
  const dir = path.join(ROOT, "mystery-box-backend", "target");
  const jars = fs.readdirSync(dir).filter((f) => f.startsWith("mystery-box-backend-") && f.endsWith(".jar"));
  if (!jars.length) throw new Error("Backend JAR not found — run mvn package first");
  return path.join(dir, jars[0]);
}

async function main() {
  const privateYml = path.join(
    ROOT,
    "mystery-box-backend/src/main/resources/application-private-test.yml",
  );
  if (!fs.existsSync(privateYml)) {
    fs.copyFileSync(
      path.join(ROOT, "mystery-box-backend/src/main/resources/application-private.test.example.yml"),
      privateYml,
    );
  }

  console.log("=== Local build ===");
  runLocal("mvn -DskipTests clean package -q", path.join(ROOT, "mystery-box-backend"));
  runLocal("npm ci --silent && npm run build:test", path.join(ROOT, "mystery-box-admin"), {
    VITE_API_PREFIX: "/test-admin/api",
    VITE_BASE: "/test-admin/",
  });

  const jarPath = findJar();
  const srcArchive = path.join(TMP, "mystery-box-test-src.tar.gz");
  const adminArchive = path.join(TMP, "admin-dist.tar.gz");

  console.log("=== Pack source ===");
  runLocal(
    `tar --exclude="mystery-box-mobile-app/node_modules" --exclude="mystery-box-admin/node_modules" --exclude="mystery-box-backend/target" -czf "${srcArchive}" mystery-box-backend mystery-box-admin scripts deploy docs`,
    ROOT,
  );
  runLocal(`tar -czf "${adminArchive}" -C mystery-box-admin dist`, ROOT);

  const conn = await connect();
  try {
    console.log("=== Remote setup ===");
    await exec(conn, `id mysterybox &>/dev/null || useradd -r -s /bin/false mysterybox`);
    await exec(
      conn,
      `mkdir -p ${REMOTE_SRC} ${REMOTE_ROOT}/releases ${REMOTE_ROOT}/logs ${REMOTE_ROOT}/data/uploads-test`,
    );

    await exec(conn, `cat > ${REMOTE_ROOT}/.env << 'ENVEOF'\n${ENV_CONTENT}\nENVEOF`);

    if (firstRun) {
      await exec(
        conn,
        `cat > /etc/nginx/conf.d/mystery-box-test.conf << 'NGXEOF'\n${NGINX_SNIPPET}\nNGXEOF`,
      );
      // Escape single quotes for remote shell: ' -> '\''
      const dbPassShell = DB_PASSWORD.replace(/'/g, `'\\''`);
      await exec(
        conn,
        `docker exec ehpay-mysql mysql -u${DB_USERNAME} -p'${dbPassShell}' -e "CREATE DATABASE IF NOT EXISTS mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"`,
      );
    }

    console.log("=== Upload artifacts ===");
    await upload(conn, srcArchive, "/tmp/mystery-box-test-src.tar.gz");
    await upload(conn, jarPath, `${REMOTE_ROOT}/releases/mystery-box-backend.jar`);
    await upload(conn, adminArchive, "/tmp/admin-dist.tar.gz");
    await exec(
      conn,
      `tar -xzf /tmp/mystery-box-test-src.tar.gz -C ${REMOTE_SRC} && chmod +x ${REMOTE_SRC}/scripts/deploy-test-server.sh`,
    );
    await exec(
      conn,
      `cat > ${REMOTE_SRC}/mystery-box-backend/src/main/resources/application-private-test.yml << 'YMLEOF'\n${PRIVATE_TEST_YML}\nYMLEOF`,
    );
    await exec(
      conn,
      `rm -rf ${REMOTE_ROOT}/releases/admin-dist && mkdir -p ${REMOTE_ROOT}/releases/admin-dist && tar -xzf /tmp/admin-dist.tar.gz -C ${REMOTE_ROOT}/releases/admin-dist --strip-components=1`,
    );
    await exec(
      conn,
      `chown -R mysterybox:mysterybox ${REMOTE_ROOT}/data ${REMOTE_ROOT}/logs && chmod -R u+rwX ${REMOTE_ROOT}/data ${REMOTE_ROOT}/logs`,
    );

    await exec(conn, `cd ${REMOTE_SRC} && bash scripts/deploy-test-server.sh deploy-only`);
    await exec(conn, "nginx -t && systemctl reload nginx");
    await exec(
      conn,
      "curl -sf http://127.0.0.1:9913/actuator/health && echo && curl -sf http://127.0.0.1:9920/test-api/actuator/health | head -c 300",
    );

    console.log("\n=== Deploy OK ===");
    console.log(`API:    http://${HOST}:9920/test-api`);
    console.log(`Admin:  http://${HOST}:9920/test-admin`);
    console.log(`Login:  admin_test / (DEFAULT_ADMIN_PASSWORD from env)`);
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
