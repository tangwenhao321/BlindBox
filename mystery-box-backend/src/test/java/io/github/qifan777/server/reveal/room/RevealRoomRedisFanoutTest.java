package io.github.qifan777.server.reveal.room;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.DefaultMessage;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class RevealRoomRedisFanoutTest {

    @Mock
    private RevealRoomStore roomStore;
    @Mock
    private StringRedisTemplate redisTemplate;

    private ObjectMapper objectMapper;
    private RevealRoomRedisFanout fanout;
    private RevealRoomHandler handler;
    private RevealRoomRedisSubscriber subscriber;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        fanout = new RevealRoomRedisFanout();
        ReflectionTestUtils.setField(fanout, "redisTemplate", redisTemplate);
        handler = new RevealRoomHandler(roomStore, objectMapper, fanout);
        subscriber = new RevealRoomRedisSubscriber(handler, fanout);
    }

    @Test
    void broadcast_publishesToRevealRoomChannel() throws Exception {
        WebSocketSession host = mockSession("room-pub", "s-host", true);
        handler.afterConnectionEstablished(host);
        host.getAttributes().put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_HOST);
        when(roomStore.getState("room-pub")).thenReturn(
                new RevealRoomStore.RoomState("room-pub", 0, 5, "idle", 0L, java.util.Set.of()));

        handler.handleProgress("room-pub", host, objectMapper.readTree("""
                {"type":"progress","revealIndex":1,"total":5,"phase":"playing","ts":42}
                """));

        ArgumentCaptor<String> channelCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(redisTemplate).convertAndSend(channelCaptor.capture(), messageCaptor.capture());
        assertThat(channelCaptor.getValue()).isEqualTo("reveal:room:room-pub");
        assertThat(messageCaptor.getValue()).contains("\"origin\":\"" + fanout.nodeId() + "\"");
        RevealRoomRedisFanout.Envelope env = fanout.parseEnvelope(messageCaptor.getValue());
        assertThat(env).isNotNull();
        assertThat(env.body()).contains("\"type\":\"progress\"");
        assertThat(env.body()).contains("\"revealIndex\":1");
        verify(host, atLeastOnce()).sendMessage(org.mockito.ArgumentMatchers.any(TextMessage.class));
    }

    @Test
    void broadcast_fallsBackLocalWhenRedisPublishFails() throws Exception {
        when(redisTemplate.convertAndSend(anyString(), anyString()))
                .thenThrow(new RuntimeException("redis down"));
        WebSocketSession host = mockSession("room-fb", "s-fb", true);
        WebSocketSession guest = mockSession("room-fb", "s-guest", true);
        handler.afterConnectionEstablished(host);
        handler.afterConnectionEstablished(guest);
        host.getAttributes().put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_HOST);
        when(roomStore.getState("room-fb")).thenReturn(
                new RevealRoomStore.RoomState("room-fb", 0, 3, "idle", 0L, java.util.Set.of()));

        handler.handleProgress("room-fb", host, objectMapper.readTree("""
                {"type":"progress","revealIndex":2,"total":3,"phase":"summary","ts":7}
                """));

        verify(guest).sendMessage(org.mockito.ArgumentMatchers.any(TextMessage.class));
    }

    @Test
    void subscriber_deliversRemoteEnvelopeToLocalSessions() throws Exception {
        WebSocketSession local = mockSession("room-remote", "s-local", true);
        handler.afterConnectionEstablished(local);

        String body = "{\"type\":\"progress\",\"revealIndex\":9,\"phase\":\"finale\",\"ts\":1}";
        String envelope = objectMapper.createObjectNode()
                .put("origin", "other-node")
                .put("body", body)
                .toString();
        byte[] channel = "reveal:room:room-remote".getBytes();
        subscriber.onMessage(new DefaultMessage(channel, envelope.getBytes()), null);

        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(local).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).isEqualTo(body);
    }

    @Test
    void subscriber_ignoresOwnOrigin() throws Exception {
        WebSocketSession local = mockSession("room-echo", "s-echo", true);
        handler.afterConnectionEstablished(local);

        String body = "{\"type\":\"leave\",\"memberId\":\"x\",\"ts\":1}";
        String envelope = objectMapper.createObjectNode()
                .put("origin", fanout.nodeId())
                .put("body", body)
                .toString();
        subscriber.onMessage(
                new DefaultMessage("reveal:room:room-echo".getBytes(), envelope.getBytes()),
                null);

        verify(local, never()).sendMessage(org.mockito.ArgumentMatchers.any(TextMessage.class));
    }

    @Test
    void roomIdFromChannel_parsesPrefix() {
        assertThat(RevealRoomRedisFanout.roomIdFromChannel("reveal:room:abc")).isEqualTo("abc");
        assertThat(RevealRoomRedisFanout.roomIdFromChannel("other")).isNull();
        assertThat(RevealRoomRedisFanout.channel("r1")).isEqualTo("reveal:room:r1");
    }

    private WebSocketSession mockSession(String roomId, String sessionId, boolean open) {
        WebSocketSession session = org.mockito.Mockito.mock(WebSocketSession.class);
        when(session.getId()).thenReturn(sessionId);
        when(session.getUri()).thenReturn(URI.create("ws://localhost/ws/reveal-room/" + roomId));
        when(session.getAttributes()).thenReturn(new ConcurrentHashMap<>());
        if (open) {
            lenient().when(session.isOpen()).thenReturn(true);
        }
        return session;
    }
}
