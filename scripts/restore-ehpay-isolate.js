/**
 * Restore ehpay nginx config and move mystery-box to dedicated port 9920.
 * Does NOT touch ehpay Java processes, MySQL data, or Redis.
 */
const { connect, exec } = require("./ssh-remote");

const HOST = "120.26.181.145";
const MB_PORT = 9920;
const REMOTE_ROOT = "/opt/mystery-box-test";

const MYSTERY_NGINX = `# mystery-box test — isolated port ${MB_PORT} (do NOT edit ehpay.conf)
server {
    listen ${MB_PORT};
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

const ENV_PATCH = `DEPLOY_ROOT=${REMOTE_ROOT}
APP_USER=mysterybox
SPRING_PROFILES_ACTIVE=testenv,private-test
TEST_SERVER_PORT=9913
JAVA_OPTS="-Xms512m -Xmx1024m"
TEST_DB_HOST=127.0.0.1
TEST_DB_PORT=3306
TEST_DB_USERNAME=root
TEST_DB_PASSWORD="Admin123#"
REDIS_URL=redis://127.0.0.1:6379/1
VITE_API_PREFIX=/test-admin/api
VITE_BASE=/test-admin/
PUBLIC_API_BASE_URL=http://${HOST}:${MB_PORT}/test-api
PUBLIC_ADMIN_URL=http://${HOST}:${MB_PORT}/test-admin
ADMIN_ACTION_OTP=TestEnvOtp2026!
DEFAULT_ADMIN_PASSWORD=Admin@Test2026
PAYMENT_MOCK_ENABLED=true
UPLOAD_DIR=${REMOTE_ROOT}/data/uploads-test
`;

async function main() {
  const conn = await connect();
  try {
    console.log("=== 1. Backup ehpay.conf ===");
    await exec(
      conn,
      "cp -a /etc/nginx/conf.d/ehpay.conf /etc/nginx/conf.d/ehpay.conf.bak-before-mystery-restore-$(date +%Y%m%d%H%M%S)",
    );

    console.log("=== 2. Remove mystery-box blocks from ehpay.conf ===");
    await exec(
      conn,
      `python3 - <<'PY'
from pathlib import Path
import re
p = Path("/etc/nginx/conf.d/ehpay.conf")
text = p.read_text()
before = text
text = re.sub(r"\\n    # mystery-box test \\(isolated from ehpay\\).*?(?=\\n\\})", "", text, flags=re.S)
text = re.sub(r"\\n    location /test-downloads/ \\{[^}]*\\}", "", text, flags=re.S)
if text == before:
    print("no mystery-box block found in ehpay.conf (already clean?)")
else:
    p.write_text(text)
    print("removed mystery-box locations from ehpay.conf")
PY`,
    );

    console.log(`=== 3. Write mystery-box-test.conf (port ${MB_PORT}) ===`);
    await exec(
      conn,
      `cat > /etc/nginx/conf.d/mystery-box-test.conf << 'NGXEOF'\n${MYSTERY_NGINX}\nNGXEOF`,
    );

    console.log("=== 4. Update mystery-box .env ===");
    await exec(conn, `cat > ${REMOTE_ROOT}/.env << 'ENVEOF'\n${ENV_PATCH}\nENVEOF`);

    console.log("=== 5. Reload nginx ===");
    await exec(conn, "nginx -t && systemctl reload nginx");

    console.log("=== 6. Verify ehpay (port 80) ===");
    await exec(conn, "curl -sfI http://127.0.0.1/ | head -3");
    await exec(conn, "curl -sf http://127.0.0.1/api/anon/monitor/download.html 2>&1 | head -c 80 || echo '(download page check skipped)'");

    console.log(`=== 7. Verify mystery-box (port ${MB_PORT}) ===`);
    await exec(conn, `curl -sf http://127.0.0.1:${MB_PORT}/test-api/actuator/health | head -c 200`);
    await exec(conn, `curl -sfI http://127.0.0.1:${MB_PORT}/test-admin/ | head -3`);
    await exec(conn, `curl -sfI http://127.0.0.1:${MB_PORT}/test-downloads/mystery-box-test.apk | head -3`);

    console.log("=== 8. Confirm port 8090 no longer mystery-box ===");
    await exec(conn, "ss -lntp | grep -E ':8090|:9920|:80 ' || true");

    console.log("\n=== Done ===");
    console.log(`ehpay restored on port 80 (ehpay.conf cleaned)`);
    console.log(`mystery-box moved to port ${MB_PORT}`);
    console.log(`API:   http://${HOST}:${MB_PORT}/test-api`);
    console.log(`Admin: http://${HOST}:${MB_PORT}/test-admin`);
    console.log(`APK:   http://${HOST}:${MB_PORT}/test-downloads/mystery-box-test.apk`);
    console.log(`\n请在阿里云安全组放行 TCP ${MB_PORT}`);
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-1500));
  process.exit(1);
});
