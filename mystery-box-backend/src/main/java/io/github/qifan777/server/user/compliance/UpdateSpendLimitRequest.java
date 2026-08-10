package io.github.qifan777.server.user.compliance;

import java.math.BigDecimal;

public record UpdateSpendLimitRequest(BigDecimal dailyLimit, BigDecimal monthlyLimit) {}
