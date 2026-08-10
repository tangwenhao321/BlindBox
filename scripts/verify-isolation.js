const { connect, exec } = require("./ssh-remote");
const BASE = "http://127.0.0.1:9920/test-api";
(async () => {
  const c = await connect();
  try {
    await exec(c, `curl -sf ${BASE}/actuator/health | head -c 120`);
    await exec(c, `curl -sf ${BASE.replace('/test-api','')}/test-admin/ | head -c 80`);
    await exec(c, "grep -c 'mystery-box\\|test-api\\|test-admin\\|test-downloads' /etc/nginx/conf.d/ehpay.conf || echo 0");
    await exec(c, "grep 'listen ' /etc/nginx/conf.d/mystery-box-test.conf");
  } finally {
    c.end();
  }
})();
