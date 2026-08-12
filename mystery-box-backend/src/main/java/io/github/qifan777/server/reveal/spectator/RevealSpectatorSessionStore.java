package io.github.qifan777.server.reveal.spectator;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class RevealSpectatorSessionStore {

    public static final long TOKEN_TTL_MS = 15 * 60 * 1000L;
    private static final String KEY_PREFIX = "reveal:spectator:";
    private static final String ORDER_INDEX_PREFIX = "reveal:spectator:order:";

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, StoredSession> memorySessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> memoryOrderIndex = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    public void save(String token, RevealSpectatorSession session) {
        StoredSession stored = StoredSession.from(session);
        registerOrderIndex(session.hostUserId(), session.orderId(), token, session.expiresAtMs());
        if (redisAvailable()) {
            try {
                redisTemplate.opsForValue().set(
                        redisKey(token),
                        objectMapper.writeValueAsString(stored),
                        Duration.ofMillis(TOKEN_TTL_MS)
                );
                return;
            } catch (Exception ex) {
                log.warn("reveal spectator redis write failed, falling back to memory: {}", ex.getMessage());
            }
        }
        memorySessions.put(token, stored);
    }

    public RevealSpectatorSession find(String token) {
        purgeExpiredMemory();
        StoredSession stored = loadStoredSession(token);
        if (stored == null) {
            return null;
        }
        if (stored.expiresAtMs() < System.currentTimeMillis()) {
            purgeToken(token, stored.hostUserId(), stored.orderId());
            return null;
        }
        return stored.toSession();
    }

    public Optional<String> findActiveTokenForOrder(String hostUserId, String orderId) {
        if (hostUserId == null || hostUserId.isBlank() || orderId == null || orderId.isBlank()) {
            return Optional.empty();
        }
        String indexKey = orderIndexKey(hostUserId, orderId);
        String token = null;
        if (redisAvailable()) {
            try {
                token = redisTemplate.opsForValue().get(orderIndexRedisKey(indexKey));
            } catch (Exception ex) {
                log.warn("reveal spectator redis order index read failed: {}", ex.getMessage());
            }
        }
        if (token == null || token.isBlank()) {
            token = memoryOrderIndex.get(indexKey);
        }
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        RevealSpectatorSession session = find(token);
        if (session == null) {
            unregisterOrderIndex(hostUserId, orderId);
            return Optional.empty();
        }
        return Optional.of(token);
    }

    public void remove(String token) {
        StoredSession stored = loadStoredSession(token);
        if (stored != null) {
            purgeToken(token, stored.hostUserId(), stored.orderId());
            return;
        }
        if (redisAvailable()) {
            try {
                redisTemplate.delete(redisKey(token));
            } catch (Exception ex) {
                log.warn("reveal spectator redis delete failed: {}", ex.getMessage());
            }
        }
        memorySessions.remove(token);
    }

    public boolean updateByHost(String token, String hostUserId, String phase, Map<String, Object> snapshotPatch) {
        if (token == null || hostUserId == null) {
            return false;
        }
        RevealSpectatorSession existing = find(token);
        if (existing == null || !hostUserId.equals(existing.hostUserId())) {
            return false;
        }
        Map<String, Object> merged = existing.snapshot() == null || existing.snapshot().isEmpty()
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(existing.snapshot());
        if (snapshotPatch != null && !snapshotPatch.isEmpty()) {
            merged.putAll(snapshotPatch);
        }
        String nextPhase = phase == null || phase.isBlank() ? existing.phase() : phase;
        long refreshedExpiry = System.currentTimeMillis() + TOKEN_TTL_MS;
        save(token, new RevealSpectatorSession(
                existing.hostUserId(),
                existing.orderId(),
                existing.boxId(),
                nextPhase,
                merged,
                refreshedExpiry
        ));
        return true;
    }

    private StoredSession loadStoredSession(String token) {
        StoredSession stored = null;
        if (redisAvailable()) {
            try {
                String json = redisTemplate.opsForValue().get(redisKey(token));
                if (json != null && !json.isBlank()) {
                    stored = objectMapper.readValue(json, StoredSession.class);
                }
            } catch (Exception ex) {
                log.warn("reveal spectator redis read failed, falling back to memory: {}", ex.getMessage());
            }
        }
        if (stored == null) {
            stored = memorySessions.get(token);
        }
        return stored;
    }

    private void purgeToken(String token, String hostUserId, String orderId) {
        unregisterOrderIndex(hostUserId, orderId);
        if (redisAvailable()) {
            try {
                redisTemplate.delete(redisKey(token));
            } catch (Exception ex) {
                log.warn("reveal spectator redis delete failed: {}", ex.getMessage());
            }
        }
        memorySessions.remove(token);
    }

    private void registerOrderIndex(String hostUserId, String orderId, String token, long expiresAtMs) {
        if (hostUserId == null || hostUserId.isBlank() || orderId == null || orderId.isBlank() || token == null) {
            return;
        }
        String indexKey = orderIndexKey(hostUserId, orderId);
        memoryOrderIndex.put(indexKey, token);
        if (redisAvailable()) {
            try {
                long ttlMs = Math.max(1L, expiresAtMs - System.currentTimeMillis());
                redisTemplate.opsForValue().set(
                        orderIndexRedisKey(indexKey),
                        token,
                        Duration.ofMillis(ttlMs)
                );
            } catch (Exception ex) {
                log.warn("reveal spectator redis order index write failed: {}", ex.getMessage());
            }
        }
    }

    private void unregisterOrderIndex(String hostUserId, String orderId) {
        if (hostUserId == null || hostUserId.isBlank() || orderId == null || orderId.isBlank()) {
            return;
        }
        String indexKey = orderIndexKey(hostUserId, orderId);
        memoryOrderIndex.remove(indexKey);
        if (redisAvailable()) {
            try {
                redisTemplate.delete(orderIndexRedisKey(indexKey));
            } catch (Exception ex) {
                log.warn("reveal spectator redis order index delete failed: {}", ex.getMessage());
            }
        }
    }

    private static String orderIndexKey(String hostUserId, String orderId) {
        return hostUserId + ":" + orderId;
    }

    private static String orderIndexRedisKey(String indexKey) {
        return ORDER_INDEX_PREFIX + indexKey;
    }

    private boolean redisAvailable() {
        return redisTemplate != null;
    }

    private static String redisKey(String token) {
        return KEY_PREFIX + token;
    }

    private void purgeExpiredMemory() {
        long now = System.currentTimeMillis();
        memorySessions.entrySet().removeIf(entry -> entry.getValue().expiresAtMs() < now);
    }

    public record RevealSpectatorSession(
            String hostUserId,
            String orderId,
            String boxId,
            String phase,
            Map<String, Object> snapshot,
            long expiresAtMs
    ) {
    }

    private record StoredSession(
            String hostUserId,
            String orderId,
            String boxId,
            String phase,
            Map<String, Object> snapshot,
            long expiresAtMs
    ) {
        static StoredSession from(RevealSpectatorSession session) {
            Map<String, Object> snapshot = session.snapshot() == null || session.snapshot().isEmpty()
                    ? Map.of()
                    : new LinkedHashMap<>(session.snapshot());
            return new StoredSession(
                    session.hostUserId(),
                    session.orderId(),
                    session.boxId(),
                    session.phase(),
                    snapshot,
                    session.expiresAtMs()
            );
        }

        RevealSpectatorSession toSession() {
            return new RevealSpectatorSession(hostUserId, orderId, boxId, phase, snapshot, expiresAtMs);
        }
    }
}
