package io.github.qifan777.server.reveal.room;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
@RequiredArgsConstructor
@Slf4j
public class RevealRoomHandler extends TextWebSocketHandler {

    public static final String TYPE_JOIN = "join";
    public static final String TYPE_LEAVE = "leave";
    public static final String TYPE_PROGRESS = "progress";
    public static final String TYPE_REACTION = "reaction";

    private final RevealRoomStore roomStore;
    private final JsonMapper objectMapper;
    private final RevealRoomRedisFanout redisFanout;
    private final ConcurrentHashMap<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> sessionMembers = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String roomId = extractRoomId(session);
        if (roomId == null) {
            closeQuietly(session, CloseStatus.BAD_DATA);
            return;
        }
        roomSessions.computeIfAbsent(roomId, ignored -> new CopyOnWriteArraySet<>()).add(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String roomId = extractRoomId(session);
        if (roomId == null) {
            return;
        }
        JsonNode payload = objectMapper.readTree(message.getPayload());
        String type = textOrNull(payload.get("type"));
        if (type == null) {
            return;
        }
        switch (type) {
            case TYPE_JOIN -> handleJoin(roomId, session, payload);
            case TYPE_LEAVE -> handleLeave(roomId, session, payload);
            case TYPE_PROGRESS -> handleProgress(roomId, session, payload);
            case TYPE_REACTION -> handleReaction(roomId, session, payload);
            default -> log.debug("ignored reveal room message type={}", type);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = extractRoomId(session);
        if (roomId == null) {
            return;
        }
        String memberId = sessionMembers.remove(session.getId());
        removeSession(roomId, session);
        if (memberId != null) {
            publishHostIdleIfNeeded(roomId, session);
            roomStore.leave(roomId, memberId);
            broadcast(roomId, Map.of(
                    "type", TYPE_LEAVE,
                    "memberId", memberId,
                    "ts", System.currentTimeMillis()
            ));
        }
    }

    void handleJoin(String roomId, WebSocketSession session, JsonNode payload) throws IOException {
        String memberId = resolveMemberId(session, payload);
        if (memberId == null) {
            return;
        }
        sessionMembers.put(session.getId(), memberId);
        roomStore.join(roomId, memberId);
        RevealRoomStore.RoomState state = roomStore.getState(roomId);
        sendJson(session, Map.of(
                "type", TYPE_JOIN,
                "memberId", memberId,
                "revealIndex", state.revealIndex(),
                "total", state.total(),
                "phase", state.phase(),
                "ts", state.ts() > 0 ? state.ts() : System.currentTimeMillis()
        ));
        broadcast(roomId, Map.of(
                "type", TYPE_JOIN,
                "memberId", memberId,
                "ts", System.currentTimeMillis()
        ), session);
    }

    void handleLeave(String roomId, WebSocketSession session, JsonNode payload) throws IOException {
        String memberId = textOrNull(payload.get("memberId"));
        if (memberId == null) {
            memberId = sessionMembers.remove(session.getId());
        }
        if (memberId != null) {
            publishHostIdleIfNeeded(roomId, session);
            roomStore.leave(roomId, memberId);
            sessionMembers.remove(session.getId());
            broadcast(roomId, Map.of(
                    "type", TYPE_LEAVE,
                    "memberId", memberId,
                    "ts", System.currentTimeMillis()
            ));
        }
        closeQuietly(session, CloseStatus.NORMAL);
    }

    private void publishHostIdleIfNeeded(String roomId, WebSocketSession session) {
        if (!isHost(session)) {
            return;
        }
        RevealRoomStore.RoomState prior = roomStore.getState(roomId);
        int revealIndex = prior.revealIndex();
        int total = prior.total();
        long ts = System.currentTimeMillis();
        roomStore.updateProgress(roomId, revealIndex, total, "idle", ts);
        java.util.Map<String, Object> progressPayload = new java.util.LinkedHashMap<>();
        progressPayload.put("type", TYPE_PROGRESS);
        progressPayload.put("revealIndex", revealIndex);
        progressPayload.put("phase", "idle");
        progressPayload.put("ts", ts);
        if (total > 0) {
            progressPayload.put("total", total);
        }
        broadcast(roomId, progressPayload);
    }

    void handleProgress(String roomId, WebSocketSession session, JsonNode payload) {
        if (!isHost(session)) {
            log.debug("ignored progress from non-host session={}", session.getId());
            return;
        }
        int revealIndex = payload.has("revealIndex") ? payload.get("revealIndex").asInt(0) : 0;
        int total = payload.has("total") ? payload.get("total").asInt(0) : 0;
        String phase = textOrNull(payload.get("phase"));
        if (phase == null) {
            phase = "idle";
        }
        long ts = payload.has("ts") ? payload.get("ts").asLong(System.currentTimeMillis()) : System.currentTimeMillis();
        RevealRoomStore.RoomState prior = roomStore.getState(roomId);
        if (total <= 0 && prior.total() > 0) {
            total = prior.total();
        }
        roomStore.updateProgress(roomId, revealIndex, total, phase, ts);
        java.util.Map<String, Object> progressPayload = new java.util.LinkedHashMap<>();
        progressPayload.put("type", TYPE_PROGRESS);
        progressPayload.put("revealIndex", revealIndex);
        progressPayload.put("phase", phase);
        progressPayload.put("ts", ts);
        if (total > 0) {
            progressPayload.put("total", total);
        }
        broadcast(roomId, progressPayload);
    }

    void handleReaction(String roomId, WebSocketSession session, JsonNode payload) {
        if (!isHost(session)) {
            log.debug("ignored reaction from non-host session={}", session.getId());
            return;
        }
        String emoji = textOrNull(payload.get("emoji"));
        if (emoji == null) {
            return;
        }
        String memberId = sessionMembers.get(session.getId());
        if (memberId == null) {
            memberId = resolveMemberId(session, payload);
        }
        if (memberId == null) {
            return;
        }
        long ts = System.currentTimeMillis();
        roomStore.addReaction(roomId, memberId, emoji, ts);
        broadcast(roomId, Map.of(
                "type", TYPE_REACTION,
                "memberId", memberId,
                "emoji", emoji,
                "ts", ts
        ));
    }

    boolean isHost(WebSocketSession session) {
        Object role = session.getAttributes().get(RevealRoomSessionAttributes.ROLE);
        return RevealRoomSessionAttributes.ROLE_HOST.equals(role);
    }

    String resolveMemberId(WebSocketSession session, JsonNode payload) {
        Object authMemberId = session.getAttributes().get(RevealRoomSessionAttributes.MEMBER_ID);
        if (authMemberId != null) {
            return String.valueOf(authMemberId);
        }
        return textOrNull(payload.get("memberId"));
    }

    void broadcast(String roomId, Map<String, Object> payload) {
        broadcast(roomId, payload, null);
    }

    void broadcast(String roomId, Map<String, Object> payload, WebSocketSession exclude) {
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            log.warn("reveal room broadcast serialize failed roomId={}: {}", roomId, ex.getMessage());
            return;
        }
        String excludeId = exclude != null ? exclude.getId() : null;
        deliverLocal(roomId, json, excludeId);
        // Other nodes fan out via Redis subscriber; local already delivered. Falls back to local-only if Redis down.
        redisFanout.tryPublish(roomId, json);
    }

    /**
     * Deliver a JSON payload to JVM-local WebSocket sessions for {@code roomId}.
     * Used by local broadcast and by {@link RevealRoomRedisSubscriber}.
     */
    void deliverLocal(String roomId, String json, String excludeSessionId) {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        TextMessage message = new TextMessage(json);
        for (WebSocketSession session : sessions) {
            if (excludeSessionId != null && excludeSessionId.equals(session.getId())) {
                continue;
            }
            if (session.isOpen()) {
                try {
                    session.sendMessage(message);
                } catch (IOException ex) {
                    log.warn("reveal room local deliver failed roomId={} session={}: {}",
                            roomId, session.getId(), ex.getMessage());
                }
            }
        }
    }

    String extractRoomId(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri == null) {
            return null;
        }
        String path = uri.getPath();
        String prefix = "/ws/reveal-room/";
        if (path == null || !path.startsWith(prefix)) {
            return null;
        }
        String roomId = path.substring(prefix.length());
        return roomId.isBlank() ? null : roomId;
    }

    private void removeSession(String roomId, WebSocketSession session) {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                roomSessions.remove(roomId);
            }
        }
    }

    private void sendJson(WebSocketSession session, Map<String, Object> payload) throws IOException {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
    }

    private static String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String text = node.asText(null);
        return text == null || text.isBlank() ? null : text;
    }

    private static void closeQuietly(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException ex) {
            log.debug("reveal room close failed: {}", ex.getMessage());
        }
    }
}
