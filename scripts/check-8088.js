const { connect, exec } = require("./ssh-remote");
(async () => {
  const c = await connect();
  try {
    await exec(c, "grep -r 8088 /etc/nginx/ 2>/dev/null || true");
    await exec(c, "curl -sfI http://127.0.0.1:8088/ | head -5");
    await exec(c, "curl -sf http://127.0.0.1:8088/test-api/actuator/health 2>&1 | head -c 100");
    await exec(c, "grep test-api /etc/nginx/conf.d/ehpay.conf || echo 'no test-api in ehpay.conf'");
  } finally {
    c.end();
  }
})();
