const { connect, exec } = require("./ssh-remote");

async function main() {
  const conn = await connect();
  try {
    console.log("Fixing DB collation...");
    await exec(
      conn,
      `docker exec ehpay-mysql mysql -uroot -p'Admin123#' -N -e "
ALTER DATABASE mystery_box_test CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
SELECT CONCAT('ALTER TABLE \\\`', table_name, '\\\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;')
FROM information_schema.tables WHERE table_schema='mystery_box_test' AND table_type='BASE TABLE';
" mystery_box_test > /tmp/fix-collate.sql`,
    );
    await exec(
      conn,
      "docker exec -i ehpay-mysql mysql -uroot -p'Admin123#' mystery_box_test < /tmp/fix-collate.sql",
    );
    console.log("Seeding hot boxes + fragment catalog if empty...");
    await exec(
      conn,
      `docker exec ehpay-mysql mysql -uroot -p'Admin123#' mystery_box_test -e "
INSERT INTO ops_home_hot_box (id, mystery_box_id, sort_order, enabled, created_time)
SELECT CONCAT('hot', LPAD(rn, 2, '0')), id, rn, 1, NOW(6)
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY edited_time DESC) rn FROM mystery_box LIMIT 6) t
WHERE NOT EXISTS (SELECT 1 FROM ops_home_hot_box LIMIT 1);

INSERT INTO fragment_exchange_sku (id, name, cover, fragment_cost, stock_remaining, enabled, sort_order)
SELECT CONCAT('fex', LPAD(rn, 2, '0')), name, cover,
  CASE UPPER(COALESCE(quality_type,'GENERAL')) WHEN 'LEGENDARY' THEN 180 WHEN 'HIDDEN' THEN 120 ELSE 35 END,
  99, 1, rn
FROM (SELECT id, name, cover, quality_type, ROW_NUMBER() OVER (ORDER BY edited_time DESC) rn FROM product LIMIT 10) p
WHERE NOT EXISTS (SELECT 1 FROM fragment_exchange_sku LIMIT 1);
"`,
    );
    await exec(conn, "systemctl restart mystery-box-test");
    await exec(conn, "sleep 35");
    await exec(conn, "curl -sf http://127.0.0.1:9913/actuator/health | head -c 80");
    console.log("\nCollation fix done");
  } finally {
    conn.end();
  }
}

main().catch((e) => {
  console.error(e.message, e.out?.slice(-2000));
  process.exit(1);
});
