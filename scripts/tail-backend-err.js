const { connect, exec } = require("./ssh-remote");
(async () => {
  const c = await connect();
  try {
    await exec(c, "tail -80 /opt/mystery-box-test/logs/backend.err.log 2>/dev/null | tail -40");
    await exec(c, "journalctl -u mystery-box-test -n 30 --no-pager 2>/dev/null | tail -20");
  } finally { c.end(); }
})();
