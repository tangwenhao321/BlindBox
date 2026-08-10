package io.github.qifan777.server.reveal.room;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RevealRoomStore {

    public static final long ROOM_TTL_MS = 30 * 60 * 1000L;
    private static final String ROOM_HASH_PREFIX = "reveal:room:";
    private static final String ROOM_MEMBERS_SUFFIX = ":members";
    private static final String ROOM_REACTIONS_SUFFIX = ":reactions";
    private static final int MAX_REACTIONS = 20;

    @Autowired(required = false)
    private StringRedisTemplate redisTemplate;

    private final ConcurrentHashMap<String, MemoryRoom> memoryRooms = new ConcurrentHashMap<>();

    public void join(String roomId, String memberId) {
        if (roomId == null || memberId == null) {
            return;
        }
        if (redisAvailable()) {
            try {
                String hashKey = roomHashKey(roomId);
                String membersKey = roomMembersKey(roomId);
                redisTemplate.opsForSet().add(membersKey, memberId);
                touchRoomTtl(roomId);
                if (redisTemplate.opsForHash().get(hashKey, "phase") == null) {
                    updateProgress(roomId, 0, 0, "idle", System.currentTimeMillis());
                }
                return;
            } catch (Exception ex) {
                log.warn("reveal room redis join failed, falling back to memory: {}", ex.getMessage());
            }
        }
        memoryRooms.compute(roomId, (id, room) -> {
            MemoryRoom current = room == null ? new MemoryRoom() : room;
            current.members.add(memberId);
            current.expiresAtMs = System.currentTimeMillis() + ROOM_TTL_MS;
            if (current.phase == null) {
                current.phase = "idle";
            }
            return current;
        });
    }

    public void leave(String roomId, String memberId) {
        if (roomId == null || memberId == null) {
            return;
        }
        if (redisAvailable()) {
            try {
                RoomState prior = readRedisState(roomId);
                redisTemplate.opsForSet().remove(roomMembersKey(roomId), memberId);
                Long remaining = redisTemplate.opsForSet().size(roomMembersKey(roomId));
                if (remaining == null || remaining == 0L) {
                    markRoomIdle(roomId, prior.revealIndex(), prior.total());
                }
                touchRoomTtl(roomId);
                return;
            } catch (Exception ex) {
                log.warn("reveal room redis leave failed, falling back to memory: {}", ex.getMessage());
            }
        }
        memoryRooms.computeIfPresent(roomId, (id, room) -> {
            room.members.remove(memberId);
            if (room.members.isEmpty()) {
                room.phase = "idle";
                room.ts = System.currentTimeMillis();
                return null;
            }
            return room;
        });
    }

    public void updateProgress(String roomId, int revealIndex, int total, String phase, long ts) {
        if (roomId == null) {
            return;
        }
        if (redisAvailable()) {
            try {
                String hashKey = roomHashKey(roomId);
                Map<String, String> fields = new java.util.LinkedHashMap<>();
                fields.put("revealIndex", String.valueOf(revealIndex));
                fields.put("phase", phase == null ? "idle" : phase);
                fields.put("ts", String.valueOf(ts));
                if (total > 0) {
                    fields.put("total", String.valueOf(total));
                }
                redisTemplate.opsForHash().putAll(hashKey, fields);
                touchRoomTtl(roomId);
                return;
            } catch (Exception ex) {
                log.warn("reveal room redis progress failed, falling back to memory: {}", ex.getMessage());
            }
        }
        memoryRooms.compute(roomId, (id, room) -> {
            MemoryRoom current = room == null ? new MemoryRoom() : room;
            current.revealIndex = revealIndex;
            if (total > 0) {
                current.total = total;
            }
            current.phase = phase == null ? "idle" : phase;
            current.ts = ts;
            current.expiresAtMs = System.currentTimeMillis() + ROOM_TTL_MS;
            return current;
        });
    }

    public void addReaction(String roomId, String memberId, String emoji, long ts) {
        if (roomId == null || memberId == null || emoji == null) {
            return;
        }
        String entry = memberId + "|" + emoji + "|" + ts;
        if (redisAvailable()) {
            try {
                String key = roomReactionsKey(roomId);
                redisTemplate.opsForList().leftPush(key, entry);
                redisTemplate.opsForList().trim(key, 0, MAX_REACTIONS - 1);
                touchRoomTtl(roomId);
                return;
            } catch (Exception ex) {
                log.warn("reveal room redis reaction failed, falling back to memory: {}", ex.getMessage());
            }
        }
        memoryRooms.compute(roomId, (id, room) -> {
            MemoryRoom current = room == null ? new MemoryRoom() : room;
            current.reactions.addFirst(entry);
            while (current.reactions.size() > MAX_REACTIONS) {
                current.reactions.removeLast();
            }
            current.expiresAtMs = System.currentTimeMillis() + ROOM_TTL_MS;
            return current;
        });
    }

    public java.util.List<ReactionEntry> recentReactions(String roomId) {
        purgeExpiredMemory();
        if (redisAvailable()) {
            try {
                java.util.List<String> raw = redisTemplate.opsForList().range(roomReactionsKey(roomId), 0, MAX_REACTIONS - 1);
                if (raw == null || raw.isEmpty()) {
                    return java.util.List.of();
                }
                return raw.stream().map(ReactionEntry::parse).filter(java.util.Objects::nonNull).toList();
            } catch (Exception ex) {
                log.warn("reveal room redis reactions read failed: {}", ex.getMessage());
            }
        }
        MemoryRoom room = memoryRooms.get(roomId);
        if (room == null) {
            return java.util.List.of();
        }
        return room.reactions.stream().map(ReactionEntry::parse).filter(java.util.Objects::nonNull).toList();
    }

    public RoomState getState(String roomId) {
        purgeExpiredMemory();
        if (redisAvailable()) {
            try {
                String hashKey = roomHashKey(roomId);
                Map<Object, Object> hash = redisTemplate.opsForHash().entries(hashKey);
                Set<String> members = redisTemplate.opsForSet().members(roomMembersKey(roomId));
                if ((hash == null || hash.isEmpty()) && (members == null || members.isEmpty())) {
                    return emptyState(roomId);
                }
                return new RoomState(
                        roomId,
                        parseInt(hash.get("revealIndex"), 0),
                        parseInt(hash.get("total"), 0),
                        stringOrDefault(hash.get("phase"), "idle"),
                        parseLong(hash.get("ts"), 0L),
                        members == null ? Set.of() : Set.copyOf(members)
                );
            } catch (Exception ex) {
                log.warn("reveal room redis read failed, falling back to memory: {}", ex.getMessage());
            }
        }
        MemoryRoom room = memoryRooms.get(roomId);
        if (room == null || room.expiresAtMs < System.currentTimeMillis()) {
            memoryRooms.remove(roomId);
            return emptyState(roomId);
        }
        return new RoomState(roomId, room.revealIndex, room.total, room.phase, room.ts, Set.copyOf(room.members));
    }

    private RoomState emptyState(String roomId) {
        return new RoomState(roomId, 0, 0, "idle", 0L, Set.of());
    }

    private void markRoomIdle(String roomId, int revealIndex, int total) {
        updateProgress(roomId, revealIndex, Math.max(total, 0), "idle", System.currentTimeMillis());
    }

    private RoomState readRedisState(String roomId) {
        try {
            String hashKey = roomHashKey(roomId);
            Map<Object, Object> hash = redisTemplate.opsForHash().entries(hashKey);
            if (hash == null || hash.isEmpty()) {
                return emptyState(roomId);
            }
            return new RoomState(
                    roomId,
                    parseInt(hash.get("revealIndex"), 0),
                    parseInt(hash.get("total"), 0),
                    stringOrDefault(hash.get("phase"), "idle"),
                    parseLong(hash.get("ts"), 0L),
                    Set.of()
            );
        } catch (Exception ex) {
            return emptyState(roomId);
        }
    }

    private void touchRoomTtl(String roomId) {
        Duration ttl = Duration.ofMillis(ROOM_TTL_MS);
        redisTemplate.expire(roomHashKey(roomId), ttl);
        redisTemplate.expire(roomMembersKey(roomId), ttl);
        redisTemplate.expire(roomReactionsKey(roomId), ttl);
    }

    private boolean redisAvailable() {
        return redisTemplate != null;
    }

    private void purgeExpiredMemory() {
        long now = System.currentTimeMillis();
        memoryRooms.entrySet().removeIf(entry -> entry.getValue().expiresAtMs < now);
    }

    private static String roomHashKey(String roomId) {
        return ROOM_HASH_PREFIX + roomId;
    }

    private static String roomMembersKey(String roomId) {
        return ROOM_HASH_PREFIX + roomId + ROOM_MEMBERS_SUFFIX;
    }

    private static String roomReactionsKey(String roomId) {
        return ROOM_HASH_PREFIX + roomId + ROOM_REACTIONS_SUFFIX;
    }

    private static int parseInt(Object value, int fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static long parseLong(Object value, long fallback) {
        if (value == null) {
            return fallback;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    private static String stringOrDefault(Object value, String fallback) {
        return value == null ? fallback : String.valueOf(value);
    }

    public record RoomState(
            String roomId,
            int revealIndex,
            int total,
            String phase,
            long ts,
            Set<String> members
    ) {
    }

    public record ReactionEntry(String memberId, String emoji, long ts) {
        static ReactionEntry parse(String raw) {
            if (raw == null || raw.isBlank()) {
                return null;
            }
            String[] parts = raw.split("\\|", 3);
            if (parts.length < 3) {
                return null;
            }
            try {
                return new ReactionEntry(parts[0], parts[1], Long.parseLong(parts[2]));
            } catch (NumberFormatException ex) {
                return null;
            }
        }
    }

    private static final class MemoryRoom {
        private int revealIndex;
        private int total;
        private String phase = "idle";
        private long ts;
        private long expiresAtMs = System.currentTimeMillis() + ROOM_TTL_MS;
        private final Set<String> members = Collections.synchronizedSet(new LinkedHashSet<>());
        private final java.util.Deque<String> reactions = new java.util.ArrayDeque<>();
    }
}
