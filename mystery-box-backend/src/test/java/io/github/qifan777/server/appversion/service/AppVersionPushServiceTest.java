package io.github.qifan777.server.appversion.service;

import io.github.qifan777.server.notification.service.ExpoPushNotificationService;
import io.github.qifan777.server.user.push.UserPushTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppVersionPushServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private ExpoPushNotificationService expoPushNotificationService;
    @Mock
    private UserPushTokenService userPushTokenService;
    @Mock
    private AppVersionReleaseService appVersionReleaseService;

    private AppVersionPushService service;

    @BeforeEach
    void setUp() {
        service = new AppVersionPushService(
                jdbcTemplate,
                expoPushNotificationService,
                userPushTokenService,
                appVersionReleaseService
        );
        ReflectionTestUtils.setField(service, "pushEnabled", true);
    }

    @Test
    void broadcast_sendsToEveryRegisteredDeviceAndRecordsTheRun() {
        when(appVersionReleaseService.get("rel-1")).thenReturn(release(AppVersionReleaseService.STATUS_PUBLISHED));
        when(userPushTokenService.listTargetsByPlatformAndChannel(
                eq("android"), eq("production"), eq(0), anyInt())).thenReturn(List.of(
                new UserPushTokenService.PushTarget("user-a", "ExponentPushToken[a]"),
                new UserPushTokenService.PushTarget("user-b", "ExponentPushToken[b]")
        ));

        int sent = service.broadcast("rel-1", "PUBLISH", "admin-1");

        assertThat(sent).isEqualTo(2);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ExpoPushNotificationService.PushMessage>> captor =
                ArgumentCaptor.forClass(List.class);
        verify(expoPushNotificationService).sendBatch(captor.capture());
        assertThat(captor.getValue())
                .extracting(ExpoPushNotificationService.PushMessage::category)
                .containsOnly(AppVersionPushService.CATEGORY);
        assertThat(captor.getValue())
                .extracting(ExpoPushNotificationService.PushMessage::refId)
                .containsOnly("9");

        verify(appVersionReleaseService).recordPush("rel-1", "PUBLISH", "admin-1", 2);
    }

    @Test
    void broadcast_refusesUnpublishedRelease() {
        when(appVersionReleaseService.get("rel-1")).thenReturn(release(AppVersionReleaseService.STATUS_DRAFT));

        int sent = service.broadcast("rel-1", "MANUAL", "admin-1");

        assertThat(sent).isZero();
        verify(expoPushNotificationService, never()).sendBatch(org.mockito.ArgumentMatchers.anyList());
    }

    @Test
    void broadcast_skipsEntirelyWhenDisabled() {
        ReflectionTestUtils.setField(service, "pushEnabled", false);

        int sent = service.broadcast("rel-1", "MANUAL", "admin-1");

        assertThat(sent).isZero();
        verify(appVersionReleaseService, never()).get(anyString());
    }

    private static AppVersionReleaseService.Release release(String status) {
        return new AppVersionReleaseService.Release(
                "rel-1",
                "android",
                "production",
                9,
                "1.1.0",
                "https://cdn.example.com/app.apk",
                false,
                0,
                "修复若干问题",
                "",
                "",
                true,
                status,
                LocalDateTime.now(),
                null,
                0,
                "admin-1",
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }
}
