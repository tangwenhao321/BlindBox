package io.github.qifan777.server.payment.service;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class PaymentNotifyLogService {
    /** Stale PROCESSING rows older than this may be reclaimed by a gateway retry. */
    private static final int STALE_PROCESSING_MINUTES = 5;

    private final JdbcTemplate jdbcTemplate;

    /**
     * Begin processing a payment notify. Unique on (out_trade_no, notify_type) so the same
     * order cannot double-enter even when retry payloads differ.
     * <p>
     * Uses {@code REQUIRES_NEW} so PROCESSING survives outer-notify rollback; failures must
     * call {@link #markFailed} so retries can reclaim.
     *
     * @return true if this notify should be processed; false if already PROCESSED / in-flight.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryBegin(String outTradeNo, String transactionId, String notifyType, String rawPayload) {
        String type = notifyType == null ? "wechat" : notifyType;
        String payloadHash = sha256(rawPayload);
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO payment_notify_log(id, out_trade_no, transaction_id, notify_type, payload_hash, status)
                            VALUES (?, ?, ?, ?, ?, 'PROCESSING')
                            """,
                    IdUtil.fastSimpleUUID(),
                    outTradeNo,
                    transactionId,
                    type,
                    payloadHash
            );
            return true;
        } catch (DuplicateKeyException ex) {
            LocalDateTime staleBefore = LocalDateTime.now().minusMinutes(STALE_PROCESSING_MINUTES);
            int reclaimed = jdbcTemplate.update(
                    """
                            UPDATE payment_notify_log
                            SET status = 'PROCESSING',
                                transaction_id = ?,
                                payload_hash = ?,
                                created_time = CURRENT_TIMESTAMP(6)
                            WHERE out_trade_no = ?
                              AND notify_type = ?
                              AND (
                                    status = 'FAILED'
                                 OR (status = 'PROCESSING' AND created_time < ?)
                              )
                            """,
                    transactionId,
                    payloadHash,
                    outTradeNo,
                    type,
                    staleBefore
            );
            return reclaimed > 0;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markProcessed(String outTradeNo, String notifyType, String rawPayload) {
        jdbcTemplate.update(
                "UPDATE payment_notify_log SET status = 'PROCESSED' WHERE out_trade_no = ? AND notify_type = ?",
                outTradeNo,
                notifyType == null ? "wechat" : notifyType
        );
    }

    /** Mark in-flight notify as FAILED so gateway retries can reclaim via {@link #tryBegin}. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String outTradeNo, String notifyType) {
        jdbcTemplate.update(
                """
                        UPDATE payment_notify_log
                        SET status = 'FAILED'
                        WHERE out_trade_no = ? AND notify_type = ? AND status = 'PROCESSING'
                        """,
                outTradeNo,
                notifyType == null ? "wechat" : notifyType
        );
    }

    private static String sha256(String rawPayload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((rawPayload == null ? "" : rawPayload).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            return String.valueOf(rawPayload == null ? 0 : rawPayload.hashCode());
        }
    }
}
