const fs = require("fs");

const files = [
  "D:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-backend/src/test/java/io/github/qifan777/server/reveal/spectator/RevealSpectatorSessionStoreRedisTest.java",
  "D:/A-WorkSpace/blindBox/mystery-box-main/mystery-box-backend/src/test/java/io/github/qifan777/server/search/service/SearchHotKeywordServiceTest.java",
];

for (const f of files) {
  let c = fs.readFileSync(f, "utf8");
  c = c.replace(
    /set\(([^,]+),\s*([^,]+),\s*any\(\)\)/g,
    "set($1, $2, any(Duration.class))"
  );
  if (!c.includes("import java.time.Duration;") && c.includes("Duration.class")) {
    c = c.replace(/^(package [^;]+;)/m, "$1\n\nimport java.time.Duration;");
  }
  // Boot 4 mockito override if present
  c = c.replace(
    /org\.springframework\.boot\.test\.mock\.mockito\.MockBean/g,
    "org.springframework.test.context.bean.override.mockito.MockitoBean"
  );
  c = c.replace(/@MockBean/g, "@MockitoBean");
  fs.writeFileSync(f, c);
  console.log("ok", f);
}
