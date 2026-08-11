-- Light device graph: map users to client device ids for multi-account risk checks.

CREATE TABLE IF NOT EXISTS user_device_link (
    user_id       VARCHAR(32)  NOT NULL,
    device_id     VARCHAR(128) NOT NULL,
    last_seen     DATETIME(6)  NOT NULL,
    created_time  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id, device_id),
    KEY idx_user_device_link_device_seen (device_id, last_seen)
) COMMENT = '用户-设备关联(风控轻量图)';
