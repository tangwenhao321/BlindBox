CREATE TABLE IF NOT EXISTS payment_notify_log (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    out_trade_no VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(128) NULL,
    notify_type VARCHAR(32) NOT NULL DEFAULT 'wechat',
    payload_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED',
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_notify_trade (out_trade_no, notify_type, payload_hash),
    KEY idx_notify_created (created_time)
);

CREATE TABLE IF NOT EXISTS job_run_audit (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    job_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL,
    message VARCHAR(512) NULL,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    started_at DATETIME(6) NOT NULL,
    finished_at DATETIME(6) NOT NULL,
    KEY idx_job_started (job_name, started_at)
);
