package io.github.qifan777.server.user.compliance;

import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserSpendLimitPreferenceService {
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;

    @Value("${security.compliance.spend-limit.cooling-off-hours:24}")
    private int coolingOffHours;

    public Optional<UserPreference> find(String userId) {
        return jdbcTemplate.query(
                        """
                                SELECT daily_limit, monthly_limit, cooling_off_until
                                FROM user_spend_limit_pref
                                WHERE user_id = ?
                                """,
                        (rs, rowNum) ->
                                new UserPreference(
                                        rs.getBigDecimal("daily_limit"),
                                        rs.getBigDecimal("monthly_limit"),
                                        rs.getObject("cooling_off_until", LocalDateTime.class)),
                        userId)
                .stream()
                .findFirst();
    }

    public UserPreference update(
            String userId, BigDecimal requestedDaily, BigDecimal requestedMonthly, BigDecimal serverDaily, BigDecimal serverMonthly) {
        BigDecimal daily = normalizeCap(requestedDaily, serverDaily, "每日");
        BigDecimal monthly = normalizeCap(requestedMonthly, serverMonthly, "每月");
        LocalDateTime coolingOffUntil = LocalDateTime.now().plusHours(Math.max(coolingOffHours, 1));
        jdbcTemplate.update(
                """
                        INSERT INTO user_spend_limit_pref (user_id, daily_limit, monthly_limit, cooling_off_until, updated_time)
                        VALUES (?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                          daily_limit = VALUES(daily_limit),
                          monthly_limit = VALUES(monthly_limit),
                          cooling_off_until = VALUES(cooling_off_until),
                          updated_time = VALUES(updated_time)
                        """,
                userId,
                daily,
                monthly,
                coolingOffUntil,
                LocalDateTime.now());
        return new UserPreference(daily, monthly, coolingOffUntil);
    }

    public void assertNotInCoolingOff(Optional<UserPreference> pref) {
        pref.map(UserPreference::coolingOffUntil)
                .filter(until -> until.isAfter(LocalDateTime.now()))
                .ifPresent(until -> {
                    throw new BusinessException("消费限额变更冷静期中，请于 " + until + " 后再下单");
                });
    }

    private BigDecimal normalizeCap(BigDecimal value, BigDecimal serverMax, String label) {
        if (value == null) {
            return MoneyRounding.round(serverMax, marketProperties.getCurrency());
        }
        BigDecimal normalized = MoneyRounding.round(value, marketProperties.getCurrency());
        if (normalized == null || normalized.signum() <= 0) {
            throw new BusinessException(label + "限额必须大于 0");
        }
        if (normalized.compareTo(serverMax) > 0) {
            throw new BusinessException(label + "限额不能超过平台上限 " + marketProperties.formatAmount(serverMax));
        }
        return normalized;
    }

    public record UserPreference(BigDecimal dailyLimit, BigDecimal monthlyLimit, LocalDateTime coolingOffUntil) {}
}
