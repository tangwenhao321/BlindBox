package io.github.qifan777.server.notification.service;



import com.fasterxml.jackson.databind.JsonNode;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.qifan777.server.notification.metrics.PushNotificationMetrics;

import io.github.qifan777.server.user.push.UserPushTokenService;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.http.HttpEntity;

import org.springframework.http.HttpHeaders;

import org.springframework.http.MediaType;

import org.springframework.http.ResponseEntity;

import org.springframework.scheduling.annotation.Async;

import org.springframework.stereotype.Service;

import org.springframework.web.client.RestTemplate;



import java.util.ArrayList;

import java.util.HashMap;

import java.util.List;

import java.util.Map;



@Service

@RequiredArgsConstructor

@Slf4j

public class ExpoPushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private static final int BATCH_SIZE = 100;



    private final UserPushTokenService userPushTokenService;

    private final RestTemplate restTemplate;

    private final PushNotificationMetrics pushNotificationMetrics;

    private final ObjectMapper objectMapper;



    @Value("${push.expo.enabled:true}")

    private boolean enabled;



    public record PushMessage(String userId, String title, String body, String category, String refId, String token) {

    }



    @Async

    public void sendToUser(String userId, String title, String body) {

        sendToUser(userId, title, body, null, null);

    }



    @Async

    public void sendToUser(String userId, String title, String body, String category, String refId) {

        if (!enabled || userId == null || userId.isBlank()) {

            return;

        }

        String token = userPushTokenService.findToken(userId);

        if (token == null || token.isBlank()) {

            return;

        }

        sendBatch(List.of(new PushMessage(userId, title, body, category, refId, token)));

    }



    public void sendBatch(List<PushMessage> messages) {

        if (!enabled || messages == null || messages.isEmpty()) {

            return;

        }

        List<PushMessage> valid = messages.stream()

                .filter(message -> message.token() != null && !message.token().isBlank())

                .toList();

        for (int offset = 0; offset < valid.size(); offset += BATCH_SIZE) {

            List<PushMessage> chunk = valid.subList(offset, Math.min(offset + BATCH_SIZE, valid.size()));

            sendChunk(chunk);

        }

    }



    private void sendChunk(List<PushMessage> chunk) {

        try {

            HttpHeaders headers = new HttpHeaders();

            headers.setContentType(MediaType.APPLICATION_JSON);

            List<Map<String, Object>> payloads = new ArrayList<>(chunk.size());

            for (PushMessage message : chunk) {

                payloads.add(toPayload(message));

            }

            ResponseEntity<String> response = restTemplate.postForEntity(

                    EXPO_PUSH_URL,

                    new HttpEntity<>(payloads, headers),

                    String.class

            );

            parseAndHandleResponse(chunk, response.getBody());

        } catch (Exception ex) {

            pushNotificationMetrics.failed();

            log.warn("Expo batch push failed count={}: {}", chunk.size(), ex.getMessage());

        }

    }



    private Map<String, Object> toPayload(PushMessage message) {

        Map<String, Object> data = new HashMap<>();

        if (message.category() != null) {

            data.put("category", message.category());

        }

        if (message.refId() != null) {

            data.put("refId", message.refId());

        }

        Map<String, Object> payload = new HashMap<>();

        payload.put("to", message.token());

        payload.put("title", message.title() == null ? "盲盒商城" : message.title());

        payload.put("body", message.body() == null ? "" : message.body());

        payload.put("sound", "default");

        if (!data.isEmpty()) {

            payload.put("data", data);

        }

        return payload;

    }



    private void parseAndHandleResponse(List<PushMessage> chunk, String body) throws Exception {

        if (body == null || body.isBlank()) {

            pushNotificationMetrics.failed();

            return;

        }

        JsonNode root = objectMapper.readTree(body);

        JsonNode data = root.get("data");

        if (data == null || !data.isArray()) {

            pushNotificationMetrics.failed();

            return;

        }

        int size = Math.min(data.size(), chunk.size());

        for (int i = 0; i < size; i++) {

            JsonNode ticket = data.get(i);

            String status = ticket.path("status").asText("");

            if ("ok".equalsIgnoreCase(status)) {

                pushNotificationMetrics.sent();

                continue;

            }

            pushNotificationMetrics.failed();

            String error = ticket.path("details").path("error").asText("");

            if ("DeviceNotRegistered".equalsIgnoreCase(error)) {

                userPushTokenService.deleteByToken(chunk.get(i).token());

            }

        }

    }

}


