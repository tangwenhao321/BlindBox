package io.github.qifan777.server.user.compliance;

import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserSpendLimitService {
    private final JdbcTemplate jdbcTemplate;
    private final UserSpendLimitPreferenceService preferenceService;

    @Value("${security.compliance.spend-limit.enabled:true}")
    private boolean enabled;

    @Value("${security.compliance.spend-limit.daily:5000}")
    private BigDecimal serverDailyLimit;

    @Value("${security.compliance.spend-limit.monthly:20000}")
    private BigDecimal serverMonthlyLimit;

    public SpendLimitView check(String userId) {
        if (!enabled) {
            return SpendLimitView.disabled();
        }
        Optional<UserSpendLimitPreferenceService.UserPreference> pref = preferenceService.find(userId);
        BigDecimal effectiveDaily = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::dailyLimit), serverDailyLimit);
        BigDecimal effectiveMonthly = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::monthlyLimit), serverMonthlyLimit);
        BigDecimal dailySpent = sumPaidSince(userId, startOfDay(LocalDate.now()));
        BigDecimal monthlySpent = sumPaidSince(userId, startOfMonth(LocalDate.now()));
        LocalDateTime coolingOffUntil = pref.map(UserSpendLimitPreferenceService.UserPreference::coolingOffUntil).orElse(null);
        boolean inCoolingOff = coolingOffUntil != null && coolingOffUntil.isAfter(LocalDateTime.now());
        return new SpendLimitView(
                true,
                effectiveDaily,
                dailySpent,
                remaining(effectiveDaily, dailySpent),
                effectiveMonthly,
                monthlySpent,
                remaining(effectiveMonthly, monthlySpent),
                withinLimits(dailySpent, monthlySpent, BigDecimal.ZERO, effectiveDaily, effectiveMonthly),
                serverDailyLimit,
                serverMonthlyLimit,
                pref.map(UserSpendLimitPreferenceService.UserPreference::dailyLimit).orElse(null),
                pref.map(UserSpendLimitPreferenceService.UserPreference::monthlyLimit).orElse(null),
                coolingOffUntil,
                inCoolingOff
        );
    }

    public SpendLimitView updateUserPreference(String userId, BigDecimal dailyLimit, BigDecimal monthlyLimit) {
        if (!enabled) {
            throw new BusinessException("平台未启用消费限额");
        }
        preferenceService.update(userId, dailyLimit, monthlyLimit, serverDailyLimit, serverMonthlyLimit);
        return check(userId);
    }

    public void assertWithinLimit(String userId, BigDecimal additionalAmount) {
        if (!enabled) {
            return;
        }
        Optional<UserSpendLimitPreferenceService.UserPreference> pref = preferenceService.find(userId);
        preferenceService.assertNotInCoolingOff(pref);
        BigDecimal increment = additionalAmount == null ? BigDecimal.ZERO : additionalAmount;
        if (increment.signum() <= 0) {
            return;
        }
        BigDecimal effectiveDaily = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::dailyLimit), serverDailyLimit);
        BigDecimal effectiveMonthly = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::monthlyLimit), serverMonthlyLimit);
        BigDecimal dailySpent = sumPaidSince(userId, startOfDay(LocalDate.now()));
        BigDecimal monthlySpent = sumPaidSince(userId, startOfMonth(LocalDate.now()));
        if (!withinLimits(dailySpent, monthlySpent, increment, effectiveDaily, effectiveMonthly)) {
            if (dailySpent.add(increment).compareTo(effectiveDaily) > 0) {
                throw new BusinessException("已超出每日消费限额（" + effectiveDaily.stripTrailingZeros().toPlainString() + " 元）");
            }
            throw new BusinessException("已超出每月消费限额（" + effectiveMonthly.stripTrailingZeros().toPlainString() + " 元）");
        }
    }

    private static BigDecimal effectiveLimit(Optional<BigDecimal> userCap, BigDecimal serverCap) {
        return userCap.filter(cap -> cap.signum() > 0).map(cap -> cap.min(serverCap)).orElse(serverCap);
    }

    private boolean withinLimits(
            BigDecimal dailySpent,
            BigDecimal monthlySpent,
            BigDecimal increment,
            BigDecimal dailyLimit,
            BigDecimal monthlyLimit) {
        BigDecimal nextDaily = dailySpent.add(increment);
        BigDecimal nextMonthly = monthlySpent.add(increment);
        return nextDaily.compareTo(dailyLimit) <= 0 && nextMonthly.compareTo(monthlyLimit) <= 0;
    }

    private BigDecimal sumPaidSince(String userId, LocalDateTime since) {
        BigDecimal sum = jdbcTemplate.queryForObject(
                """
                        SELECT COALESCE(SUM(p.pay_amount), 0)
                        FROM payment p
                        JOIN mystery_box_order mbo ON mbo.id = p.id
                        WHERE mbo.creator_id = ?
                          AND p.pay_time IS NOT NULL
                          AND p.pay_time >= ?
                        """,
                BigDecimal.class,
                userId,
                since
        );
        return sum == null ? BigDecimal.ZERO : sum.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal remaining(BigDecimal limit, BigDecimal spent) {
        BigDecimal value = limit.subtract(spent);
        return value.signum() < 0 ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static LocalDateTime startOfDay(LocalDate date) {
        return date.atStartOfDay();
    }

    private static LocalDateTime startOfMonth(LocalDate date) {
        return date.withDayOfMonth(1).atTime(LocalTime.MIN);
    }

    public record SpendLimitView(
            boolean enabled,
            BigDecimal dailyLimit,
            BigDecimal dailySpent,
            BigDecimal dailyRemaining,
            BigDecimal monthlyLimit,
            BigDecimal monthlySpent,
            BigDecimal monthlyRemaining,
            boolean withinLimits,
            BigDecimal serverDailyLimit,
            BigDecimal serverMonthlyLimit,
            BigDecimal userDailyLimit,
            BigDecimal userMonthlyLimit,
            LocalDateTime coolingOffUntil,
            boolean inCoolingOff
    ) {
        public static SpendLimitView disabled() {
            return new SpendLimitView(
                    false, null, null, null, null, null, null, true,
                    null, null, null, null, null, false);
        }
    }
}
