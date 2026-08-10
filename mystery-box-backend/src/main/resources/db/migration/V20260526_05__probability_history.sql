CREATE TABLE IF NOT EXISTS mystery_box_probability_history (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    mystery_box_id VARCHAR(32) NOT NULL,
    legendary_rate INT NOT NULL,
    hidden_rate INT NOT NULL,
    general_rate INT NOT NULL,
    effective_time DATETIME(6) NOT NULL,
    operator_id VARCHAR(32) NULL,
    created_time DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_prob_hist_box_time (mystery_box_id, effective_time DESC)
);
