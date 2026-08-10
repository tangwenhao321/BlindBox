const { connect, exec } = require("./ssh-remote");
(async () => {
  const c = await connect();
  try {
    await exec(c, "grep -n 'listen ' /etc/nginx/conf.d/ehpay.conf");
    await exec(c, "tail -30 /var/log/nginx/access.log 2>/dev/null | grep 9920 || tail -5 /var/log/nginx/access.log");
    await exec(c, "tail -20 /opt/mystery-box-test/logs/backend.err.log 2>/dev/null || echo 'no err log'");
    await exec(c, "iptables -L INPUT -n 2>/dev/null | head -15 || echo 'no iptables'");
  } finally { c.end(); }
})();
