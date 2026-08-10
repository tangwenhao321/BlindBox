package io.github.qifan777.server.reveal.room;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class RevealRoomWebSocketConfig implements WebSocketConfigurer {

    private final RevealRoomHandler revealRoomHandler;
    private final RevealRoomAuthHandshakeInterceptor authHandshakeInterceptor;

    @Value("${app.cors.allowed-origin-patterns:*}")
    private String allowedOriginPatterns;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        List<String> origins = Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        String[] allowedOrigins = origins.isEmpty() ? new String[] { "*" } : origins.toArray(String[]::new);
        registry.addHandler(revealRoomHandler, "/ws/reveal-room/{roomId}")
                .addInterceptors(authHandshakeInterceptor)
                .setAllowedOrigins(allowedOrigins);
    }
}
