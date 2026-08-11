package io.github.qifan777.server.user.compliance;

import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserSpendLimitService {
    private final JdbcTemplate jdbcTemplate;
    private final UserSpendLimitPreferenceService preferenceService;
    private final MinorProtectionService minorProtectionService;
    private final MarketProperties marketProperties;

    @Value("${security.compliance.spend-limit.enabled:true}")
    private boolean enabled;

    @Value("${security.compliance.spend-limit.daily:5000}")
    private BigDecimal serverDailyLimit;

    @Value("${security.compliance.spend-limit.monthly:20000}")
    private BigDecimal serverMonthlyLimit;

    public SpendLimitView check(String userId) {
        MinorProtectionService.MinorPolicy policy = minorProtectionService.resolvePolicy(userId);
        if (!enabled) {
            // Age tier still travels to the client: it drives reveal audio and the verification banner
            // even on a deployment that runs without spend caps.
            return SpendLimitView.disabled(policy);
        }
        Optional<UserSpendLimitPreferenceService.UserPreference> pref = preferenceService.find(userId);
        BigDecimal ageCappedDaily = minorProtectionService.applyTierCap(serverDailyLimit, policy);
        BigDecimal ageCappedMonthly = minorProtectionService.applyTierCap(serverMonthlyLimit, policy);
        BigDecimal effectiveDaily = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::dailyLimit), ageCappedDaily);
        BigDecimal effectiveMonthly = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::monthlyLimit), ageCappedMonthly);
        BigDecimal dailySpent = sumPaidSince(userId, startOfDay(LocalDate.now()), null);
        BigDecimal monthlySpent = sumPaidSince(userId, startOfMonth(LocalDate.now()), null);
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
                inCoolingOff,
                policy.ageTier().name(),
                policy.minor(),
                policy.verified(),
                policy.purchaseAllowed(),
                policy.audioVolumeScale(),
                policy.hardDailyCapMinor()
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
        assertWithinLimit(userId, additionalAmount, null);
    }

    /**
     * @param excludeOrderId when checking prepay for an existing unpaid order, exclude it from the
     *                       unpaid backlog so its payAmount is not double-counted with {@code additionalAmount}.
     */
    public void assertWithinLimit(String userId, BigDecimal additionalAmount, String excludeOrderId) {
        // Runs regardless of the spend-limit toggle: blocking under-age purchases is a legal obligation,
        // not a commercial setting.
        minorProtectionService.assertPurchaseAllowed(userId);
        if (!enabled) {
            return;
        }
        Optional<UserSpendLimitPreferenceService.UserPreference> pref = preferenceService.find(userId);
        preferenceService.assertNotInCoolingOff(pref);
        BigDecimal increment = additionalAmount == null ? BigDecimal.ZERO : additionalAmount;
        if (increment.signum() <= 0) {
            return;
        }
        MinorProtectionService.MinorPolicy policy = minorProtectionService.resolvePolicy(userId);
        BigDecimal ageCappedDaily = minorProtectionService.applyTierCap(serverDailyLimit, policy);
        BigDecimal ageCappedMonthly = minorProtectionService.applyTierCap(serverMonthlyLimit, policy);
        BigDecimal effectiveDaily = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::dailyLimit), ageCappedDaily);
        BigDecimal effectiveMonthly = effectiveLimit(pref.map(UserSpendLimitPreferenceService.UserPreference::monthlyLimit), ageCappedMonthly);
        BigDecimal dailySpent = sumPaidSince(userId, startOfDay(LocalDate.now()), excludeOrderId);
        BigDecimal monthlySpent = sumPaidSince(userId, startOfMonth(LocalDate.now()), excludeOrderId);
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

    private BigDecimal sumPaidSince(String userId, LocalDateTime since, String excludeOrderId) {
        BigDecimal paid = jdbcTemplate.queryForObject(
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
        // Count unpaid backlog so parallel TO_BE_PAID creates cannot bypass daily/monthly caps.
        BigDecimal unpaid;
        if (excludeOrderId != null && !excludeOrderId.isBlank()) {
            unpaid = jdbcTemplate.queryForObject(
                    """
                            SELECT COALESCE(SUM(p.pay_amount), 0)
                            FROM payment p
                            JOIN mystery_box_order mbo ON mbo.id = p.id
                            WHERE mbo.creator_id = ?
                              AND mbo.status = 'TO_BE_PAID'
                              AND p.pay_time IS NULL
                              AND mbo.created_time >= ?
                              AND mbo.id <> ?
                            """,
                    BigDecimal.class,
                    userId,
                    since,
                    excludeOrderId
            );
        } else {
            unpaid = jdbcTemplate.queryForObject(
                    """
                            SELECT COALESCE(SUM(p.pay_amount), 0)
                            FROM payment p
                            JOIN mystery_box_order mbo ON mbo.id = p.id
                            WHERE mbo.creator_id = ?
                              AND mbo.status = 'TO_BE_PAID'
                              AND p.pay_time IS NULL
                              AND mbo.created_time >= ?
                            """,
                    BigDecimal.class,
                    userId,
                    since
            );
        }
        BigDecimal sum = (paid == null ? BigDecimal.ZERO : paid)
                .add(unpaid == null ? BigDecimal.ZERO : unpaid);
        return MoneyRounding.round(sum, marketProperties.getCurrency());
    }

    private BigDecimal remaining(BigDecimal limit, BigDecimal spent) {
        BigDecimal value = limit.subtract(spent);
        BigDecimal rounded = MoneyRounding.round(
                value.signum() < 0 ? BigDecimal.ZERO : value,
                marketProperties.getCurrency());
        return rounded == null ? BigDecimal.ZERO : rounded;
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
            boolean inCoolingOff,
            String ageTier,
            boolean minor,
            boolean identityVerified,
            boolean purchaseAllowed,
            double audioVolumeScale,
            BigDecimal hardDailyCapMinor
    ) {
        public static SpendLimitView disabled(MinorProtectionService.MinorPolicy policy) {
            return new SpendLimitView(
                    false, null, null, null, null, null, null, true,
                    null, null, null, null, null, false,
                    policy.ageTier().name(), policy.minor(), policy.verified(), policy.purchaseAllowed(),
                    policy.audioVolumeScale(), policy.hardDailyCapMinor());
        }
    }
}
