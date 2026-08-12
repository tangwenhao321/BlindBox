package io.github.qifan777.server.user.compliance;

import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserComplianceService {
    private final JdbcTemplate jdbcTemplate;

    public void confirmAge(String userId) {
        confirmAge(userId, null);
    }

    public void confirmAge(String userId, Integer birthYear) {
        if (birthYear != null) {
            int age = LocalDate.now().getYear() - birthYear;
            if (age < 18 || age >= 120) {
                throw new BusinessException("仅年满 18 周岁用户可确认");
            }
        }
        jdbcTemplate.update(
                """
                        INSERT INTO user_compliance (user_id, age_confirmed_at, created_time)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE age_confirmed_at = VALUES(age_confirmed_at)
                        """,
                userId,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    public boolean isAgeConfirmed(String userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_compliance WHERE user_id = ?",
                Integer.class,
                userId
        );
        return count != null && count > 0;
    }

    public void assertAgeConfirmed(String userId) {
        if (!isAgeConfirmed(userId)) {
            throw new BusinessException("请先确认已满 18 周岁后再下单");
        }
    }
}
