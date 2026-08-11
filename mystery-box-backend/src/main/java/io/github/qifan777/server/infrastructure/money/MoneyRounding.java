package io.github.qifan777.server.infrastructure.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Currency-aware money scale: VND uses integer (scale 0); others use 2 decimal places.
 */
public final class MoneyRounding {

    private MoneyRounding() {
    }

    public static int scaleForCurrency(String currency) {
        if (currency != null && "VND".equalsIgnoreCase(currency.trim())) {
            return 0;
        }
        return 2;
    }

    public static BigDecimal round(BigDecimal amount, String currency) {
        if (amount == null) {
            return null;
        }
        return amount.setScale(scaleForCurrency(currency), RoundingMode.HALF_UP);
    }

    public static BigDecimal roundDown(BigDecimal amount, String currency) {
        if (amount == null) {
            return null;
        }
        return amount.setScale(scaleForCurrency(currency), RoundingMode.DOWN);
    }

    /**
     * WeChat fen / VNPay {@code vnp_Amount} style: major × 100, HALF_UP.
     */
    public static long toGatewayMinorUnits(BigDecimal majorAmount) {
        if (majorAmount == null) {
            return 0L;
        }
        return majorAmount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).longValue();
    }

    public static int toGatewayMinorUnitsInt(BigDecimal majorAmount) {
        long value = toGatewayMinorUnits(majorAmount);
        if (value > Integer.MAX_VALUE || value < Integer.MIN_VALUE) {
            throw new IllegalArgumentException("gateway minor amount out of int range: " + value);
        }
        return (int) value;
    }

    public static boolean matchesGatewayMinor(Long amountMinor, BigDecimal payAmount) {
        if (amountMinor == null || payAmount == null) {
            return false;
        }
        return amountMinor == toGatewayMinorUnits(payAmount);
    }
}
