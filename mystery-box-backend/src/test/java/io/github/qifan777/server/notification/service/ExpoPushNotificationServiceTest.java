package io.github.qifan777.server.notification.service;



import tools.jackson.databind.json.JsonMapper;

import io.github.qifan777.server.notification.metrics.PushNotificationMetrics;

import io.github.qifan777.server.user.push.UserPushTokenService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;

import org.mockito.InjectMocks;

import org.mockito.Mock;

import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.http.HttpEntity;

import org.springframework.http.ResponseEntity;

import org.springframework.test.util.ReflectionTestUtils;

import org.springframework.web.client.RestTemplate;



import java.util.List;

import java.util.Map;



import static org.assertj.core.api.Assertions.assertThat;

import static org.mockito.ArgumentMatchers.any;

import static org.mockito.ArgumentMatchers.eq;

import static org.mockito.Mockito.verify;

import static org.mockito.Mockito.when;



@ExtendWith(MockitoExtension.class)

class ExpoPushNotificationServiceTest {



    @Mock

    private UserPushTokenService userPushTokenService;



    @Mock

    private RestTemplate restTemplate;



    @Mock

    private PushNotificationMetrics pushNotificationMetrics;



    private final JsonMapper objectMapper = JsonMapper.shared();



    @InjectMocks
    private ExpoPushNotificationService expoPushNotificationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(expoPushNotificationService, "objectMapper", objectMapper);
    }

    @Test

    void sendToUser_includesCategoryAndRefIdInPayload() {

        ReflectionTestUtils.setField(expoPushNotificationService, "enabled", true);

        when(userPushTokenService.findTokens("u1")).thenReturn(List.of("ExponentPushToken[abc]"));

        when(restTemplate.postForEntity(eq("https://exp.host/--/api/v2/push/send"), any(), eq(String.class)))

                .thenReturn(ResponseEntity.ok("{\"data\":[{\"status\":\"ok\",\"id\":\"ticket-1\"}]}"));



        expoPushNotificationService.sendToUser("u1", "待支付", "请尽快支付", "PENDING_PAY", "order-9");



        ArgumentCaptor<HttpEntity<?>> captor = ArgumentCaptor.forClass(HttpEntity.class);

        verify(restTemplate).postForEntity(eq("https://exp.host/--/api/v2/push/send"), captor.capture(), eq(String.class));

        @SuppressWarnings("unchecked")

        List<Map<String, Object>> body = (List<Map<String, Object>>) captor.getValue().getBody();

        assertThat(body).isNotNull().hasSize(1);

        assertThat(body.get(0).get("to")).isEqualTo("ExponentPushToken[abc]");

        @SuppressWarnings("unchecked")

        Map<String, Object> data = (Map<String, Object>) body.get(0).get("data");

        assertThat(data.get("category")).isEqualTo("PENDING_PAY");

        assertThat(data.get("refId")).isEqualTo("order-9");

        verify(pushNotificationMetrics).sent();

    }



    @Test

    void sendBatch_cleansUpInvalidTokens() {

        ReflectionTestUtils.setField(expoPushNotificationService, "enabled", true);

        when(restTemplate.postForEntity(eq("https://exp.host/--/api/v2/push/send"), any(), eq(String.class)))

                .thenReturn(ResponseEntity.ok(

                        "{\"data\":[{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}]}"

                ));



        expoPushNotificationService.sendBatch(List.of(

                new ExpoPushNotificationService.PushMessage("u1", "title", "body", "QUEUE", "box-1", "ExponentPushToken[dead]")

        ));



        verify(userPushTokenService).deleteByToken("ExponentPushToken[dead]");

        verify(pushNotificationMetrics).failed();

    }

}


