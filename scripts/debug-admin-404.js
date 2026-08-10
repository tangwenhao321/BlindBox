const { connect, exec } = require("./ssh-remote");
(async () => {
  const c = await connect();
  try {
    const cmds = [
      "curl -sfI http://127.0.0.1:9920/test-admin/ 2>&1 | head -10",
      "curl -sfI http://127.0.0.1:9920/test-admin/index.html 2>&1 | head -10",
      "curl -sf http://127.0.0.1:9920/test-admin/ 2>&1 | head -c 200",
      "ls -la /opt/mystery-box-test/releases/admin-dist/ | head -20",
      "test -f /opt/mystery-box-test/releases/admin-dist/index.html && echo HAS_INDEX || echo NO_INDEX",
      "cat /etc/nginx/conf.d/mystery-box-test.conf",
    ];
    for (const cmd of cmds) await exec(c, cmd);
  } finally {
    c.end();
  }
})().catch((e) => {
  console.error(e.message, e.out?.slice(-1000));
  process.exit(1);
});
