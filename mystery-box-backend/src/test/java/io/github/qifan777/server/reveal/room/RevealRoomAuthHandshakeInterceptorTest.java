package io.github.qifan777.server.reveal.room;

import io.github.qifan777.server.reveal.spectator.RevealSpectatorSessionStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.socket.WebSocketHandler;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevealRoomAuthHandshakeInterceptorTest {

    @Mock
    private RevealSpectatorSessionStore spectatorSessionStore;

    @Mock
    private WebSocketHandler webSocketHandler;

    private RevealRoomAuthHandshakeInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new RevealRoomAuthHandshakeInterceptor(spectatorSessionStore);
    }

    @Test
    void extractRoomId_parsesPath() {
        assertThat(RevealRoomAuthHandshakeInterceptor.extractRoomId(
                URI.create("ws://localhost/ws/reveal-room/order-1?token=abc")))
                .isEqualTo("order-1");
    }

    @Test
    void extractToken_readsQueryParam() {
        assertThat(RevealRoomAuthHandshakeInterceptor.extractToken(
                URI.create("ws://localhost/ws/reveal-room/order-1?token=abc")))
                .isEqualTo("abc");
    }

    @Test
    void beforeHandshake_acceptsSpectatorTokenForMatchingOrder() {
        when(spectatorSessionStore.find("spectator-token")).thenReturn(
                new RevealSpectatorSessionStore.RevealSpectatorSession(
                        "host-user",
                        "e2e-smoke-order",
                        "box-1",
                        "playing",
                        Map.of("productId", "p1"),
                        System.currentTimeMillis() + 60_000
                )
        );
        Map<String, Object> attributes = new HashMap<>();
        ServerHttpRequest request = servletRequest("/ws/reveal-room/e2e-smoke-order", "token=spectator-token");

        boolean ok = interceptor.beforeHandshake(request, null, webSocketHandler, attributes);

        assertThat(ok).isTrue();
        assertThat(attributes.get(RevealRoomSessionAttributes.ROLE)).isEqualTo(RevealRoomSessionAttributes.ROLE_SPECTATOR);
    }

    @Test
    void beforeHandshake_rejectsMissingToken() {
        Map<String, Object> attributes = new HashMap<>();
        ServerHttpRequest request = servletRequest("/ws/reveal-room/order-1", null);

        boolean ok = interceptor.beforeHandshake(request, null, webSocketHandler, attributes);

        assertThat(ok).isFalse();
    }

    private static ServerHttpRequest servletRequest(String path, String query) {
        MockHttpServletRequest servlet = new MockHttpServletRequest("GET", path);
        if (query != null) {
            servlet.setQueryString(query);
        }
        return new ServletServerHttpRequest(servlet);
    }
}
