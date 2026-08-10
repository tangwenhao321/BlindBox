package io.github.qifan777.server.ops.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsEventServiceFunnelTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private AnalyticsEventService service;

    @BeforeEach
    void setUp() {
        service = new AnalyticsEventService(jdbcTemplate, new ObjectMapper());
    }

    @Test
    void funnel_includesGuestMetrics() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(Object[].class)))
                .thenAnswer(invocation -> {
                    String sql = invocation.getArgument(0, String.class);
                    if (sql.contains("actor_id LIKE 'guest:%'") && sql.contains("COUNT(DISTINCT")) {
                        return 3;
                    }
                    if (sql.contains("actor_id LIKE 'guest:%'")) {
                        return 7;
                    }
                    if (sql.contains("actor_id NOT LIKE 'guest:%'")) {
                        return 5;
                    }
                    if (sql.contains("event_name = ?") && invocation.getArgument(2).equals("app_open")) {
                        return 4;
                    }
                    if (sql.contains("event_name = ?")) {
                        return 1;
                    }
                    if (sql.contains("COUNT(1) FROM analytics_event WHERE (? <= 0")) {
                        return 30;
                    }
                    return 0;
                });

        AnalyticsEventService.FunnelView funnel = service.funnel(60);

        assertThat(funnel.guestEventCount()).isEqualTo(7);
        assertThat(funnel.guestUniqueDevices()).isEqualTo(3);
        assertThat(funnel.registeredUniqueActors()).isEqualTo(5);
        assertThat(funnel.totalEvents()).isEqualTo(30);
        assertThat(funnel.windowMinutes()).isEqualTo(60);
        assertThat(funnel.paymentFail()).isGreaterThanOrEqualTo(0);
        assertThat(funnel.paymentCancel()).isGreaterThanOrEqualTo(0);
    }
}
