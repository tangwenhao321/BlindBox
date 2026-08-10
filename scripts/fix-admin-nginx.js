/** Fix admin 404: redirect /test-admin -> /test-admin/ and improve SPA fallback */
const { connect, exec } = require("./ssh-remote");

const REMOTE_ROOT = "/opt/mystery-box-test";
const MB_PORT = 9920;

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

async function main() {
  const conn = await connect();
  try {
    await exec(
      conn,
      `cat > /etc/nginx/conf.d/mystery-box-test.conf << 'NGXEOF'\n${MYSTERY_NGINX}\nNGXEOF`,
    );
    await exec(conn, "nginx -t && systemctl reload nginx");

    await exec(conn, "curl -sfI http://127.0.0.1:9920/test-admin | head -3");
    await exec(conn, "curl -sfI http://127.0.0.1:9920/test-admin/ | head -3");
    await exec(conn, "curl -sfI http://127.0.0.1:9920/test-admin/assets/index-Jyj1ts08.js | head -3");
    console.log("\nAdmin nginx fixed");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-1500));
  process.exit(1);
});
