const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    await exec(conn, "cat /etc/nginx/conf.d/ehpay.conf");
    await exec(conn, "echo '--- BACKUP FILES ---'; ls -la /etc/nginx/conf.d/*.bak* 2>/dev/null || ls -la /etc/nginx/conf.d/");
    await exec(conn, "grep -r '8090' /home/transaction/ehpay/ 2>/dev/null | head -20");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
