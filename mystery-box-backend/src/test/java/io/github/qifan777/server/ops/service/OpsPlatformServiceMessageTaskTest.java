package io.github.qifan777.server.ops.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.qifan777.server.infrastructure.audit.AuditTrailService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpsPlatformServiceMessageTaskTest {

    @Mock
    private AuditTrailService auditTrailService;
    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private UserNotificationService userNotificationService;

    private OpsPlatformService service;

    @BeforeEach
    void setUp() {
        service = new OpsPlatformService(
                auditTrailService,
                jdbcTemplate,
                userNotificationService,
                new ObjectMapper()
        );
    }

    @Test
    void runMessageTask_pushesNotificationsForSegmentUsers() {
        String taskId = "task-1";
        when(jdbcTemplate.queryForObject(eq("SELECT COUNT(1) FROM ops_message_task WHERE id = ?"), eq(Integer.class), eq(taskId)))
                .thenReturn(1);
        when(jdbcTemplate.queryForObject(
                eq("SELECT id, template_name, segment_id, status, created_time, edited_time FROM ops_message_task WHERE id = ?"),
                any(RowMapper.class),
                eq(taskId)
        )).thenReturn(new OpsPlatformService.MessageTask(
                taskId,
                "活动通知",
                "seg-1",
                "DONE",
                LocalDateTime.now(),
                LocalDateTime.now()
        ));
        when(jdbcTemplate.query(
                eq("SELECT rule_json FROM ops_segment WHERE id = ?"),
                any(org.springframework.jdbc.core.ResultSetExtractor.class),
                eq("seg-1")
        )).thenReturn("{\"all\":true}");
        when(jdbcTemplate.queryForList(
                eq("SELECT id FROM user ORDER BY created_time DESC LIMIT ?"),
                eq(String.class),
                eq(500)
        )).thenReturn(List.of("user-a", "user-b"));

        service.runMessageTask("admin-1", taskId, "trace-1");

        verify(userNotificationService, times(2)).push(
                anyString(),
                eq("OPS_MESSAGE"),
                eq("活动通知"),
                anyString(),
                eq(taskId)
        );
        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(auditTrailService).record(
                eq("OPS_MESSAGE_TASK_RUN"),
                eq("admin-1"),
                eq("messageTask"),
                eq(taskId),
                eq("trace-1"),
                payloadCaptor.capture()
        );
        assertEquals(2, payloadCaptor.getValue().get("notificationsSent"));
    }
}
