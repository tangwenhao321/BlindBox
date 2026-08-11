package io.github.qifan777.server.risk.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RiskControlServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private RiskControlService riskControlService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(riskControlService, "enabled", true);
        ReflectionTestUtils.setField(riskControlService, "confirmThreshold", 80);
        ReflectionTestUtils.setField(riskControlService, "velocityThreshold", 3);
        ReflectionTestUtils.setField(riskControlService, "velocityWindowMs", 60_000L);
        ReflectionTestUtils.setField(riskControlService, "deviceUserLimit", 5);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any()))
                .thenReturn(0);
    }

    @Test
    void evaluateOrderAction_blocksWhenDeviceVelocityExceeded() {
        RiskControlService.RiskDecision last = null;
        for (int i = 0; i < 4; i++) {
            last = riskControlService.evaluateOrderAction("u1", "device-a", "1.2.3.4");
        }
        assertThat(last).isNotNull();
        assertThat(last.blocked()).isTrue();
        assertThat(last.reason()).isEqualTo("velocity_exceeded");
    }

    @Test
    void evaluateOrderAction_blocksWhenIpVelocityExceeded() {
        RiskControlService.RiskDecision last = null;
        for (int i = 0; i < 4; i++) {
            last = riskControlService.evaluateOrderAction("u" + i, "device-" + i, "9.9.9.9");
        }
        assertThat(last).isNotNull();
        assertThat(last.blocked()).isTrue();
    }

    @Test
    void evaluateOrderAction_blocksWhenDeviceLinkedToTooManyUsers() {
        ReflectionTestUtils.setField(riskControlService, "deviceUserLimit", 2);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any()))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0);
                    if (sql != null && sql.contains("user_device_link")) {
                        return 3;
                    }
                    return 0;
                });

        RiskControlService.RiskDecision decision =
                riskControlService.evaluateOrderAction("u1", "shared-device", "1.1.1.1");

        assertThat(decision.blocked()).isTrue();
        assertThat(decision.reason()).isEqualTo("device_multi_user");
    }

    @Test
    void evaluateOrderAction_allowsUnderThreshold() {
        RiskControlService.RiskDecision decision =
                riskControlService.evaluateOrderAction("u1", "device-b", "8.8.8.8", "phone-hash");
        assertThat(decision.blocked()).isFalse();
        assertThat(decision.score()).isEqualTo(0);
    }
}
