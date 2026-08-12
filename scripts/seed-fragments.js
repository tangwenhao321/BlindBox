const fs = require("fs");
const path = require("path");
const { connect, exec, upload } = require("./ssh-remote");
const { mysqlRootPassword, shellSingleQuote } = require("./deploy-secrets");

const SQL = `-- Seed fragment exchange catalog for test env
DELETE FROM fragment_exchange_sku WHERE id LIKE 'fex%';

INSERT INTO fragment_exchange_sku (id, name, cover, fragment_cost, stock_remaining, enabled, sort_order)
SELECT
    CONCAT('fex', LPAD(seq.rn, 2, '0')),
    LEFT(p.name, 64),
    IFNULL(NULLIF(p.cover, ''), 'https://via.placeholder.com/200'),
    CASE UPPER(COALESCE(p.quality_type, 'GENERAL'))
        WHEN 'LEGENDARY' THEN 180
        WHEN 'LEGEND' THEN 180
        WHEN 'HIDDEN' THEN 120
        WHEN 'EPIC' THEN 90
        WHEN 'RARE' THEN 60
        ELSE 35
    END,
    99,
    1,
    seq.rn
FROM product p
JOIN (
    SELECT p2.id, ROW_NUMBER() OVER (ORDER BY p2.edited_time DESC) AS rn
    FROM product p2
    LIMIT 15
) seq ON seq.id = p.id;

SELECT COUNT(*) AS sku_count FROM fragment_exchange_sku WHERE enabled = 1;
`;

async function main() {
  const _dbPass = shellSingleQuote(mysqlRootPassword());
  const tmp = path.join(require("os").tmpdir(), "seed-fragments.sql");
  fs.writeFileSync(tmp, SQL);
  const conn = await connect();
  try {
    await upload(conn, tmp, "/tmp/seed-fragments.sql");
    await exec(
      conn,
      "docker exec -i ehpay-mysql mysql -uroot -p" + _dbPass + " mystery_box_test < /tmp/seed-fragments.sql",
    );
    await exec(
      conn,
      "curl -sf http://127.0.0.1:9920/test-api/front/fragment/exchange-skus -H 'token: $(curl -sf -X POST http://127.0.0.1:9920/test-api/front/user/login -H \"Content-Type: application/json\" -d \"{\\\"phone\\\":\\\"13900000001\\\",\\\"password\\\":\\\"Test@123456\\\"}\" | python3 -c \"import sys,json; print(json.load(sys.stdin)[\\\"result\\\"][\\\"tokenValue\\\"])\")' | head -c 200",
    );
    console.log("\nFragment SKUs seeded");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-1500));
  process.exit(1);
});
