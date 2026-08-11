-- One in-flight/processed notify per order+channel (blocks double-enter with different payloads).
-- Drop duplicates first so the new unique key can be applied.
DELETE t1 FROM payment_notify_log t1
INNER JOIN payment_notify_log t2
    ON t1.out_trade_no = t2.out_trade_no
   AND t1.notify_type = t2.notify_type
   AND (
        t1.created_time > t2.created_time
        OR (t1.created_time = t2.created_time AND t1.id > t2.id)
   );

ALTER TABLE payment_notify_log
    DROP INDEX uk_notify_trade,
    ADD UNIQUE KEY uk_notify_order (out_trade_no, notify_type);
