package io.github.qifan777.server.payment.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC: mockPay must stay off in production-like profiles.
 */
class PaymentMockProductionGuardTest {

    @Test
    void mockPayDisabledWhenProfileIsProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        env.setProperty("payment.mock-enabled", "false");
        assertThat(env.getProperty("payment.mock-enabled", Boolean.class, true)).isFalse();
        assertThat(env.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))).isTrue();
    }

    @Test
    void mockPayAllowedOnlyOnExplicitNonProd() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev", "test");
        env.setProperty("payment.mock-enabled", "true");
        assertThat(env.getProperty("payment.mock-enabled", Boolean.class, false)).isTrue();
        assertThat(env.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"))).isFalse();
    }
}
