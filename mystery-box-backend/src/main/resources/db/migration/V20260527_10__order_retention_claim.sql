CREATE TABLE IF NOT EXISTS order_payment_retention_claim (
    order_id VARCHAR(32) NOT NULL PRIMARY KEY,
    user_id VARCHAR(32) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    claimed_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);
