const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    const cmds = [
      "echo '=== LISTEN PORTS ===' && ss -lntp | grep -E 'nginx|java|node|8090|9913|80|443|3000|8080|9216|9217' || true",
      "echo '=== NGINX CONF FILES ===' && ls -la /etc/nginx/conf.d/",
      "echo '=== EHPAY CONF (grep listen/location) ===' && grep -nE 'listen|location|mystery|test-' /etc/nginx/conf.d/ehpay.conf | head -80",
      "echo '=== MYSTERY-BOX NGINX ===' && cat /etc/nginx/conf.d/mystery-box-test.conf 2>/dev/null || echo '(no mystery-box-test.conf)'",
      "echo '=== EHPAY PROCESSES ===' && ps aux | grep -E 'jeepay|ehpay|8090' | grep -v grep | head -20",
      "echo '=== MYSTERY BOX SERVICE ===' && systemctl status mystery-box-test --no-pager 2>&1 | head -15",
      "echo '=== CURL EHPAY HEALTH ===' && curl -sfI http://127.0.0.1/ 2>&1 | head -5; curl -sfI http://127.0.0.1:8090/ 2>&1 | head -5",
    ];
    for (const c of cmds) await exec(conn, c);
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-2000));
  process.exit(1);
});
