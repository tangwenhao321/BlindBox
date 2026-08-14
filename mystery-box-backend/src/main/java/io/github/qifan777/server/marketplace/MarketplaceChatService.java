package io.github.qifan777.server.marketplace;

import cn.hutool.core.util.IdUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Minimal C2C text chat scoped to a marketplace listing (seller ∪ buyer).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceChatService {
    private final JdbcTemplate jdbcTemplate;
    private final MarketplaceChatSseHub chatSseHub;
    private final ObjectMapper objectMapper;

    public record ChatMessage(
            String id,
            String userId,
            String nickname,
            String msgType,
            String body,
            LocalDateTime createdTime
    ) {
    }

    public List<ChatMessage> listChat(String listingId, String userId, int limit) {
        requireParticipant(listingId, userId);
        return listChatUnchecked(listingId, limit);
    }

    private List<ChatMessage> listChatUnchecked(String listingId, int limit) {
        int size = Math.min(Math.max(limit, 1), 100);
        return jdbcTemplate.query(
                """
                        SELECT c.id, c.user_id, u.nickname, c.msg_type, c.body, c.created_time
                        FROM marketplace_listing_chat c
                        LEFT JOIN user u ON u.id = c.user_id
                        WHERE c.listing_id = ?
                        ORDER BY c.created_time DESC LIMIT ?
                        """,
                (rs, i) -> new ChatMessage(
                        rs.getString("id"),
                        rs.getString("user_id"),
                        rs.getString("nickname"),
                        rs.getString("msg_type"),
                        rs.getString("body"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                listingId,
                size
        );
    }

    @Transactional
    public void postChat(String listingId, String userId, String msgType, String body) {
        requireParticipant(listingId, userId);
        String type = msgType == null || msgType.isBlank() ? "TEXT" : msgType.trim().toUpperCase(Locale.ROOT);
        if (body == null || body.isBlank()) {
            throw new BusinessException("MARKETPLACE_EMPTY_MESSAGE: 消息不能为空");
        }
        String trimmed = body.trim();
        jdbcTemplate.update(
                """
                        INSERT INTO marketplace_listing_chat (id, listing_id, user_id, msg_type, body, created_time)
                        VALUES (?,?,?,?,?,?)
                        """,
                IdUtil.fastSimpleUUID(),
                listingId,
                userId,
                type,
                trimmed.substring(0, Math.min(trimmed.length(), 500)),
                LocalDateTime.now()
        );
        broadcastChat(listingId);
    }

    public void broadcastChat(String listingId) {
        try {
            List<ChatMessage> messages = listChatUnchecked(listingId, 50);
            chatSseHub.broadcast(listingId, objectMapper.writeValueAsString(messages));
        } catch (Exception ex) {
            log.debug("marketplace chat broadcast failed listing={}: {}", listingId, ex.getMessage());
        }
    }

    private void requireParticipant(String listingId, String userId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                        SELECT seller_user_id, buyer_user_id
                        FROM marketplace_listing WHERE id = ?
                        """,
                listingId
        );
        if (rows.isEmpty()) {
            throw new BusinessException("MARKETPLACE_LISTING_NOT_FOUND: 挂单不存在");
        }
        Map<String, Object> row = rows.get(0);
        String sellerId = (String) row.get("seller_user_id");
        String buyerId = (String) row.get("buyer_user_id");
        if (!userId.equals(sellerId) && (buyerId == null || !userId.equals(buyerId))) {
            throw new BusinessException("MARKETPLACE_CHAT_FORBIDDEN: 仅买卖双方可聊天");
        }
    }
}
