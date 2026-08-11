package io.github.qifan777.server.infrastructure.money;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MoneyRoundingTest {

    @Test
    void scaleForCurrency_vndIsZero() {
        assertThat(MoneyRounding.scaleForCurrency("VND")).isZero();
        assertThat(MoneyRounding.scaleForCurrency("vnd")).isZero();
    }

    @Test
    void scaleForCurrency_othersAreTwo() {
        assertThat(MoneyRounding.scaleForCurrency("CNY")).isEqualTo(2);
        assertThat(MoneyRounding.scaleForCurrency(null)).isEqualTo(2);
        assertThat(MoneyRounding.scaleForCurrency("USD")).isEqualTo(2);
    }

    @Test
    void round_vndHalfUpToInteger() {
        assertThat(MoneyRounding.round(new BigDecimal("12.4"), "VND")).isEqualByComparingTo("12");
        assertThat(MoneyRounding.round(new BigDecimal("12.5"), "VND")).isEqualByComparingTo("13");
    }

    @Test
    void round_cnyKeepsTwoDecimals() {
        assertThat(MoneyRounding.round(new BigDecimal("12.345"), "CNY")).isEqualByComparingTo("12.35");
    }
}
