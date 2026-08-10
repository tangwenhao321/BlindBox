package io.github.qifan777.server.user.compliance;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(MockitoExtension.class)
class UserSpendLimitPreferenceServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private UserSpendLimitPreferenceService service;

    @BeforeEach
    void setUp() {
        service = new UserSpendLimitPreferenceService(jdbcTemplate);
        ReflectionTestUtils.setField(service, "coolingOffHours", 24);
    }

    @Test
    void update_throwsWhenDailyCapExceedsServerMax() {
        BigDecimal serverDaily = new BigDecimal("100");
        BigDecimal serverMonthly = new BigDecimal("1000");
        assertThrows(
                BusinessException.class,
                () -> service.update("user-1", new BigDecimal("200"), new BigDecimal("500"), serverDaily, serverMonthly));
    }

    @Test
    void update_throwsWhenMonthlyCapExceedsServerMax() {
        BigDecimal serverDaily = new BigDecimal("100");
        BigDecimal serverMonthly = new BigDecimal("1000");
        assertThrows(
                BusinessException.class,
                () -> service.update("user-1", new BigDecimal("50"), new BigDecimal("2000"), serverDaily, serverMonthly));
    }

    @Test
    void assertNotInCoolingOff_throwsWhenStillInCoolingOffPeriod() {
        UserSpendLimitPreferenceService.UserPreference pref =
                new UserSpendLimitPreferenceService.UserPreference(
                        new BigDecimal("50"),
                        new BigDecimal("500"),
                        LocalDateTime.now().plusHours(2));
        assertThrows(BusinessException.class, () -> service.assertNotInCoolingOff(Optional.of(pref)));
    }

    @Test
    void assertNotInCoolingOff_allowsWhenCoolingOffExpired() {
        UserSpendLimitPreferenceService.UserPreference pref =
                new UserSpendLimitPreferenceService.UserPreference(
                        new BigDecimal("50"),
                        new BigDecimal("500"),
                        LocalDateTime.now().minusHours(1));
        service.assertNotInCoolingOff(Optional.of(pref));
    }

    @Test
    void assertNotInCoolingOff_allowsWhenNoPreference() {
        service.assertNotInCoolingOff(Optional.empty());
    }
}
