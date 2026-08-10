package io.github.qifan777.server.user.hint;

import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserHintCardService {
    private final JdbcTemplate jdbcTemplate;

    public int balance(String userId) {
        Integer balance = jdbcTemplate.queryForObject(
                "SELECT COALESCE(hint_cards, 0) FROM `user` WHERE id = ?",
                Integer.class,
                userId
        );
        return balance == null ? 0 : balance;
    }

    @Transactional
    public void grant(String userId, int amount) {
        if (amount <= 0) {
            return;
        }
        int updated = jdbcTemplate.update(
                "UPDATE `user` SET hint_cards = COALESCE(hint_cards, 0) + ?, edited_time = NOW(6) WHERE id = ?",
                amount,
                userId
        );
        if (updated == 0) {
            throw new BusinessException("用户不存在");
        }
    }

    @Transactional
    public void consume(String userId, int amount) {
        if (amount <= 0) {
            return;
        }
        int updated = jdbcTemplate.update(
                """
                        UPDATE `user`
                        SET hint_cards = hint_cards - ?, edited_time = NOW(6)
                        WHERE id = ? AND COALESCE(hint_cards, 0) >= ?
                        """,
                amount,
                userId,
                amount
        );
        if (updated == 0) {
            throw new BusinessException("提示卡不足");
        }
    }
}
