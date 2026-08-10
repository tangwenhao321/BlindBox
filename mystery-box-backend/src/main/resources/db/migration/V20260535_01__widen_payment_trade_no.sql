-- WeChat / mock trade numbers exceed legacy VARCHAR(36).
ALTER TABLE payment
    MODIFY COLUMN trade_no VARCHAR(64) NULL;
