package io.github.qifan777.server.infrastructure.audit;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuditTrailService {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public void record(String action, String actorId, String objectType, String objectId, String traceId, Map<String, Object> payload) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO audit_trail(action_key, actor_id, object_type, object_id, trace_id, payload_json) VALUES (?, ?, ?, ?, ?, ?)",
                    action,
                    actorId == null ? "" : actorId,
                    objectType == null ? "" : objectType,
                    objectId == null ? "" : objectId,
                    traceId == null ? "" : traceId,
                    objectMapper.writeValueAsString(payload == null ? Map.of() : payload)
            );
        } catch (Exception exception) {
            log.warn("audit record failed: {}", exception.getMessage());
        }
    }

    public List<Map<String, Object>> latest(int limit) {
        return jdbcTemplate.query(
                "SELECT action_key, actor_id, object_type, object_id, trace_id, payload_json, created_time FROM audit_trail ORDER BY id DESC LIMIT ?",
                (rs, rowNum) -> {
                    Map<String, Object> payload = Map.of();
                    try {
                        payload = objectMapper.readValue(rs.getString("payload_json"), new TypeReference<>() {
                        });
                    } catch (Exception ignored) {
                    }
                    return Map.of(
                            "time", String.valueOf(rs.getTimestamp("created_time").toLocalDateTime()),
                            "action", rs.getString("action_key"),
                            "actorId", rs.getString("actor_id"),
                            "objectType", rs.getString("object_type"),
                            "objectId", rs.getString("object_id"),
                            "traceId", rs.getString("trace_id"),
                            "payload", payload
                    );
                },
                Math.max(1, limit)
        );
    }
}
