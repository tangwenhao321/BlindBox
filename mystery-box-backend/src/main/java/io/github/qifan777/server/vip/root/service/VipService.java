package io.github.qifan777.server.vip.root.service;

import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.vip.config.VipConfigRepository;
import io.github.qifan777.server.vip.root.repository.VipRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@Slf4j
@AllArgsConstructor
@Transactional
public class VipService {
    /** Fold-style discount: 10 = no VIP cut, 9 = 10% off, … 1 = 90% off. */
    public static final BigDecimal MIN_DISCOUNT_FOLD = new BigDecimal("1.0");
    public static final BigDecimal MAX_DISCOUNT_FOLD = new BigDecimal("9.9");

    private final VipRepository vipRepository;
    private final VipConfigRepository vipConfigRepository;
    private final MarketProperties marketProperties;

    public BigDecimal calculate(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return vipRepository.findCurrentUserVip()
                .map(vip -> {
                    if (!vip.endTime().isAfter(LocalDateTime.now())) {
                        return BigDecimal.ZERO;
                    }
                    BigDecimal fold = clampFold(vipConfigRepository.get().getDiscount());
                    if (fold == null) {
                        return BigDecimal.ZERO;
                    }
                    BigDecimal rate = BigDecimal.TEN.subtract(fold).divide(BigDecimal.TEN, 4, RoundingMode.HALF_UP);
                    BigDecimal raw = amount.multiply(rate).min(amount);
                    return MoneyRounding.round(raw, marketProperties.getCurrency());
                })
                .orElse(BigDecimal.ZERO);
    }

    /** @return clamped fold, or null if config is unusable */
    public static BigDecimal clampFold(BigDecimal discount) {
        if (discount == null) {
            return null;
        }
        if (discount.compareTo(MIN_DISCOUNT_FOLD) < 0 || discount.compareTo(MAX_DISCOUNT_FOLD) > 0) {
            return null;
        }
        return discount;
    }
}
