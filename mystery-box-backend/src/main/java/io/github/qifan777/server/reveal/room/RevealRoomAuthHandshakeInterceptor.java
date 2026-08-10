package io.github.qifan777.server.reveal.room;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.reveal.spectator.RevealSpectatorSessionStore;
import io.github.qifan777.server.reveal.spectator.RevealSpectatorSessionStore.RevealSpectatorSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URI;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RevealRoomAuthHandshakeInterceptor implements HandshakeInterceptor {

    private static final String ROOM_PREFIX = "/ws/reveal-room/";

    private final RevealSpectatorSessionStore spectatorSessionStore;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        URI uri = request.getURI();
        String roomId = extractRoomId(uri);
        String token = extractToken(uri);
        if (roomId == null || roomId.isBlank() || token == null || token.isBlank()) {
            log.debug("reveal room handshake rejected: missing roomId or token");
            return false;
        }

        try {
            Object loginId = StpUtil.getLoginIdByToken(token);
            if (loginId != null) {
                attributes.put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_HOST);
                attributes.put(RevealRoomSessionAttributes.MEMBER_ID, String.valueOf(loginId));
                return true;
            }
        } catch (Exception ex) {
            log.trace("reveal room token is not a host session: {}", ex.getMessage());
        }

        RevealSpectatorSession session = spectatorSessionStore.find(token);
        if (session != null && roomId.equals(session.orderId())) {
            String memberId = "spectator:" + token.substring(0, Math.min(8, token.length()));
            attributes.put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_SPECTATOR);
            attributes.put(RevealRoomSessionAttributes.MEMBER_ID, memberId);
            return true;
        }

        log.debug("reveal room handshake rejected: invalid token for roomId={}", roomId);
        return false;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
        /* no-op */
    }

    static String extractRoomId(URI uri) {
        if (uri == null) {
            return null;
        }
        String path = uri.getPath();
        if (path == null || !path.startsWith(ROOM_PREFIX)) {
            return null;
        }
        String roomId = path.substring(ROOM_PREFIX.length());
        return roomId.isBlank() ? null : roomId;
    }

    static String extractToken(URI uri) {
        if (uri == null || uri.getQuery() == null) {
            return null;
        }
        for (String part : uri.getQuery().split("&")) {
            int eq = part.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            if ("token".equals(part.substring(0, eq))) {
                return part.substring(eq + 1);
            }
        }
        return null;
    }
}
