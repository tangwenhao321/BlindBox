package io.github.qifan777.server.payment.service;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class PaymentNotifyLogService {
    private final JdbcTemplate jdbcTemplate;

    /**
     * @return true if this notify should be processed; false if duplicate.
     */
    public boolean tryBegin(String outTradeNo, String transactionId, String notifyType, String rawPayload) {
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
                    notifyType == null ? "wechat" : notifyType,
                    payloadHash
            );
            return true;
        } catch (DuplicateKeyException ex) {
            return false;
        }
    }

    public void markProcessed(String outTradeNo, String notifyType, String rawPayload) {
        String payloadHash = sha256(rawPayload);
        jdbcTemplate.update(
                "UPDATE payment_notify_log SET status = 'PROCESSED' WHERE out_trade_no = ? AND notify_type = ? AND payload_hash = ?",
                outTradeNo,
                notifyType == null ? "wechat" : notifyType,
                payloadHash
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
