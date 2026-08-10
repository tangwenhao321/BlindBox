const { connect, exec } = require("./ssh-remote");
(async () => {
  const c = await connect();
  try {
    const urls = [
      "http://127.0.0.1:9920/test-admin",
      "http://127.0.0.1:9920/test-admin/",
      "http://127.0.0.1:9920/test-admin/login",
      "http://127.0.0.1:9920/test-admin/assets/index-Jyj1ts08.js",
    ];
    for (const u of urls) {
      await exec(c, `curl -sfI '${u}' 2>&1 | head -1 || echo FAIL ${u}`);
    }
  } finally {
    c.end();
  }
})();
