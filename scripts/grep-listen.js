const { connect, exec } = require("./ssh-remote");
(async () => {
  const c = await connect();
  try {
    await exec(c, "grep -n 'listen ' /etc/nginx/conf.d/ehpay.conf /etc/nginx/conf.d/mystery-box-test.conf");
  } finally {
    c.end();
  }
})();
