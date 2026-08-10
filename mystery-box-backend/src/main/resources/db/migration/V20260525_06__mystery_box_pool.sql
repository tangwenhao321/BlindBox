ALTER TABLE mystery_box
    ADD COLUMN pool_total INT NOT NULL DEFAULT 100 COMMENT '奖池总票数',
    ADD COLUMN pool_remaining INT NOT NULL DEFAULT 100 COMMENT '奖池剩余票数';

UPDATE mystery_box mb
SET pool_total = GREATEST(
        COALESCE((SELECT COUNT(*) * 10 FROM mystery_box_product_rel r WHERE r.mystery_box_id = mb.id), 0),
        100
    ),
    pool_remaining = GREATEST(
        COALESCE((SELECT COUNT(*) * 10 FROM mystery_box_product_rel r WHERE r.mystery_box_id = mb.id), 0),
        100
    );
