-- Parallel coin ledger (lucky coins / star stones) with idempotent unique key when related_ref_id is present.
-- MySQL UNIQUE allows multiple NULLs, so uniqueness only applies when related_ref_id is NOT NULL.

CREATE TABLE IF NOT EXISTS user_coin_log (
    id              VARCHAR(32)  NOT NULL PRIMARY KEY,
    user_id         VARCHAR(32)  NOT NULL,
    coin_type       VARCHAR(32)  NOT NULL COMMENT 'LUCKY_COIN / STAR_STONE',
    change_amount   INT          NOT NULL COMMENT 'signed delta; credit positive',
    change_type     VARCHAR(64)  NOT NULL,
    related_ref_id  VARCHAR(64)  NULL COMMENT 'idempotency ref when present',
    created_time    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY idx_user_coin_log_user_time (user_id, created_time),
    UNIQUE KEY uk_user_coin_log_idempotency (user_id, coin_type, change_type, related_ref_id)
) COMMENT = '用户币种台账(并行账本)';
