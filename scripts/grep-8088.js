const { connect, exec } = require("./ssh-remote");
(async () => {
  const c = await connect();
  try {
    await exec(c, "grep -n -A20 'listen.*8088' /etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf 2>/dev/null");
  } finally {
    c.end();
  }
})();
