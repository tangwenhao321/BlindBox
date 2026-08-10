package io.github.qifan777.server.ops.controller;

import io.github.qifan777.server.ops.service.AnalyticsEventService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsForOpsControllerTest {

    @Mock
    private AnalyticsEventService analyticsEventService;

    @InjectMocks
    private AnalyticsForOpsController controller;

    @org.junit.jupiter.api.BeforeEach
    void enableAnalytics() {
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "analyticsEnabled", true);
    }

    @Test
    void ingestGuest_returnsZeroWhenAnalyticsDisabled() {
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "analyticsEnabled", false);
        var event = new AnalyticsEventService.AnalyticsEventInput("app_open", Map.of("deviceId", "device-abc"), null);

        Integer accepted = controller.ingestGuest(List.of(event));

        assertThat(accepted).isZero();
    }

    @Test
    void ingestGuest_usesDeviceIdFromPayload() {
        var event = new AnalyticsEventService.AnalyticsEventInput(
                "app_open",
                Map.of("deviceId", "device-abc"),
                null
        );
        when(analyticsEventService.ingest(List.of(event), "guest:device-abc")).thenReturn(1);

        Integer accepted = controller.ingestGuest(List.of(event));

        assertThat(accepted).isEqualTo(1);
        verify(analyticsEventService).ingest(List.of(event), "guest:device-abc");
    }

    @Test
    void ingestGuest_fallsBackToUnknownActor() {
        var event = new AnalyticsEventService.AnalyticsEventInput("screen_view", Map.of(), null);
        when(analyticsEventService.ingest(List.of(event), "guest:unknown")).thenReturn(1);

        controller.ingestGuest(List.of(event));

        verify(analyticsEventService).ingest(eq(List.of(event)), eq("guest:unknown"));
    }

    @Test
    void trace_delegatesToService() {
        when(analyticsEventService.eventsByActor("guest:dev-1", 50, 60, null, null)).thenReturn(List.of());

        controller.trace("guest:dev-1", 50, 60, null, null);

        verify(analyticsEventService).eventsByActor("guest:dev-1", 50, 60, null, null);
    }
}
