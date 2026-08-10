-- 在测试服务器 MySQL 上执行（与四方 vip 库隔离）
-- mysql -uroot -p < deploy/sql/init-test-mysql.sql

CREATE DATABASE IF NOT EXISTS mystery_box_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

CREATE USER IF NOT EXISTS 'mystery_box_test'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_STRONG_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'mystery_box_test'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_DB_PASSWORD';

GRANT ALL PRIVILEGES ON mystery_box_test.* TO 'mystery_box_test'@'127.0.0.1';
GRANT ALL PRIVILEGES ON mystery_box_test.* TO 'mystery_box_test'@'localhost';
FLUSH PRIVILEGES;

-- 注意: 勿授予 mystery_box_test 访问 vip 或其他四方库权限
