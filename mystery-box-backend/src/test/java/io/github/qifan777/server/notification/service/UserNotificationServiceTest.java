package io.github.qifan777.server.notification.service;

import io.github.qifan777.server.user.notification.UserNotificationPrefService;
import io.github.qifan777.server.user.notification.dto.NotificationPrefView;
import io.github.qifan777.server.user.push.UserPushTokenService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserNotificationServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ExpoPushNotificationService expoPushNotificationService;
    @Mock
    private UserNotificationPrefService userNotificationPrefService;
    @Mock
    private UserPushTokenService userPushTokenService;

    @InjectMocks
    private UserNotificationService userNotificationService;

    @Test
    void push_alwaysInsertsInAppNotification() {
        when(userNotificationPrefService.get("u1"))
                .thenReturn(new NotificationPrefView(false, true, true, true, true));

        userNotificationService.push("u1", "ORDER", "title", "body", "ref-1");

        verify(jdbcTemplate).update(anyString(), anyString(), eq("u1"), eq("ORDER"), eq("title"), eq("body"), eq("ref-1"), any());
        verify(expoPushNotificationService, never()).sendBatch(anyList());
    }

    @Test
    void push_sendsExpoWhenPrefAllows() {
        when(userNotificationPrefService.get("u1"))
                .thenReturn(new NotificationPrefView(true, true, true, true, true));
        when(userPushTokenService.findTokens("u1")).thenReturn(List.of("ExponentPushToken[abc]"));

        userNotificationService.push("u1", "QUEUE", "轮到您", "请开盒", "box-1");

        verify(expoPushNotificationService).sendBatch(argThat(messages ->
                messages.size() == 1
                        && "u1".equals(messages.get(0).userId())
                        && "ExponentPushToken[abc]".equals(messages.get(0).token())
        ));
    }

    @Test
    void push_fansOutToEveryRegisteredDevice() {
        when(userNotificationPrefService.get("u1"))
                .thenReturn(new NotificationPrefView(true, true, true, true, true));
        when(userPushTokenService.findTokens("u1"))
                .thenReturn(List.of("ExponentPushToken[phone]", "ExponentPushToken[tablet]"));

        userNotificationService.push("u1", "QUEUE", "轮到您", "请开盒", "box-1");

        verify(expoPushNotificationService).sendBatch(argThat(messages ->
                messages.size() == 2
                        && "ExponentPushToken[phone]".equals(messages.get(0).token())
                        && "ExponentPushToken[tablet]".equals(messages.get(1).token())
        ));
    }

    @Test
    void pushBulk_batchesInsertsAndRespectsPerUserPrefs() {
        when(userNotificationPrefService.findAll(List.of("u1", "u2"))).thenReturn(Map.of(
                "u1", new NotificationPrefView(true, true, true, true, true),
                "u2", new NotificationPrefView(true, true, true, true, false)
        ));
        when(userPushTokenService.findTargets(List.of("u1", "u2"))).thenReturn(List.of(
                new UserPushTokenService.PushTarget("u1", "ExponentPushToken[a]"),
                new UserPushTokenService.PushTarget("u2", "ExponentPushToken[b]")
        ));

        int persisted = userNotificationService.pushBulk(
                List.of("u1", "u2", "u1"), "OPS_MESSAGE", "活动", "body", "task-1");

        assertEquals(2, persisted);
        verify(jdbcTemplate).batchUpdate(anyString(), anyList());
        verify(expoPushNotificationService).sendBatch(argThat(messages ->
                messages.size() == 1 && "u1".equals(messages.get(0).userId())
        ));
    }

    @Test
    void push_blocksMarketingWhenDisabled() {
        when(userNotificationPrefService.get("u1"))
                .thenReturn(new NotificationPrefView(true, true, true, true, false));

        userNotificationService.push("u1", "OPS_MESSAGE", "活动", "body", "x");

        verify(jdbcTemplate).update(anyString(), anyString(), eq("u1"), eq("OPS_MESSAGE"), eq("活动"), eq("body"), eq("x"), any());
        verify(expoPushNotificationService, never()).sendBatch(anyList());
    }
}
