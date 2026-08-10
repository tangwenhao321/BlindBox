/**
 * Mobile networks often block non-standard ports (9920).
 * Re-expose mystery-box on port 80 under /test-api (does NOT conflict with ehpay /api/).
 */
const { connect, exec } = require("./ssh-remote");

const REMOTE_ROOT = "/opt/mystery-box-test";

const LOCATIONS = `
    # mystery-box test API (path isolated from ehpay /api/)
    location ^~ /test-api/ {
        rewrite ^/test-api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:9913;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
    location ^~ /test-admin/api/ {
        rewrite ^/test-admin/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:9913;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location ^~ /test-admin/ {
        alias ${REMOTE_ROOT}/releases/admin-dist/;
        index index.html;
        try_files $uri $uri/ /test-admin/index.html;
    }
    location = /test-admin {
        return 301 /test-admin/;
    }
    location = /test-admin/index.html {
        alias ${REMOTE_ROOT}/releases/admin-dist/index.html;
    }
    location ^~ /test-api/uploads/ {
        alias ${REMOTE_ROOT}/data/uploads-test/;
        expires 7d;
    }
    location ^~ /test-downloads/ {
        alias ${REMOTE_ROOT}/releases/;
        autoindex off;
        default_type application/octet-stream;
        add_header Content-Disposition 'attachment';
        expires 1d;
    }
`;

async function main() {
  const conn = await connect();
  try {
    await exec(
      conn,
      "cp -a /etc/nginx/conf.d/ehpay.conf /etc/nginx/conf.d/ehpay.conf.bak-mobile-api-$(date +%Y%m%d%H%M%S)",
    );
    await exec(
      conn,
      `python3 - <<'PY'
from pathlib import Path
import re
p = Path("/etc/nginx/conf.d/ehpay.conf")
text = p.read_text()
locations = ${JSON.stringify(LOCATIONS)}
# Remove old mystery-box blocks if any
text = re.sub(r"\\n    # mystery-box test API \\(path isolated.*?(?=\\n    location|\\n    try_files|\\n    # [^m]|\\n\\})", "", text, flags=re.S)
text = re.sub(r"\\n    location \\^~ /test-api/.*?(?=\\n    location|\\n    try_files|\\n\\})", "", text, flags=re.S)
# Insert after server_name in port 80 block
marker = "listen 80 default_server;"
idx = text.find(marker)
if idx < 0:
    raise SystemExit("port 80 block missing")
srv = text.find("server_name", idx)
insert_at = text.find("\\n", srv) + 1
if "location ^~ /test-api/" not in text:
    text = text[:insert_at] + locations + text[insert_at:]
    p.write_text(text)
    print("inserted mystery-box locations on port 80")
else:
    print("already present")
PY`,
    );
    await exec(conn, "nginx -t && systemctl reload nginx");
    await exec(conn, "curl -sf http://127.0.0.1/test-api/actuator/health | head -c 120");
    await exec(conn, "curl -sfI http://127.0.0.1/test-admin | head -2");
    console.log("\nPort 80 API ready:");
    console.log("  http://120.26.181.145/test-api");
    console.log("  http://120.26.181.145/test-admin");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-1500));
  process.exit(1);
});
