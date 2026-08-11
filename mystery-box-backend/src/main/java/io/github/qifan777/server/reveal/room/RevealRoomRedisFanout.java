package io.github.qifan777.server.reveal.room;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Publishes reveal-room WebSocket events to Redis channel {@code reveal:room:{roomId}}
 * so other JVM nodes can fan out to their local sessions.
 */
@Component
@Slf4j
public class RevealRoomRedisFanout {

    public static final String CHANNEL_PREFIX = "reveal:room:";

    private final String nodeId = UUID.randomUUID().toString();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    public String nodeId() {
        return nodeId;
    }

    public static String channel(String roomId) {
        return CHANNEL_PREFIX + roomId;
    }

    public static String roomIdFromChannel(String channel) {
        if (channel == null || !channel.startsWith(CHANNEL_PREFIX)) {
            return null;
        }
        String roomId = channel.substring(CHANNEL_PREFIX.length());
        return roomId.isBlank() ? null : roomId;
    }

    /**
     * @return true if published to Redis; false if Redis unavailable (caller keeps local-only fanout)
     */
    public boolean tryPublish(String roomId, String bodyJson) {
        if (roomId == null || bodyJson == null || redisTemplate == null) {
            return false;
        }
        try {
            ObjectNode envelope = objectMapper.createObjectNode();
            envelope.put("origin", nodeId);
            envelope.put("body", bodyJson);
            redisTemplate.convertAndSend(channel(roomId), objectMapper.writeValueAsString(envelope));
            return true;
        } catch (Exception ex) {
            log.warn("reveal room redis publish failed roomId={}: {}", roomId, ex.getMessage());
            return false;
        }
    }

    public record Envelope(String origin, String body) {
    }

    public Envelope parseEnvelope(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            var node = objectMapper.readTree(raw);
            String origin = node.path("origin").asText(null);
            String body = node.path("body").asText(null);
            if (origin == null || body == null) {
                return null;
            }
            return new Envelope(origin, body);
        } catch (Exception ex) {
            log.warn("reveal room redis envelope parse failed: {}", ex.getMessage());
            return null;
        }
    }
}
