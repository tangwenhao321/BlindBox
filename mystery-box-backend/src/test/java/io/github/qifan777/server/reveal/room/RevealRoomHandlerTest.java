package io.github.qifan777.server.reveal.room;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class RevealRoomHandlerTest {

    @Mock
    private RevealRoomStore roomStore;

    private ObjectMapper objectMapper;
    private RevealRoomRedisFanout redisFanout;
    private RevealRoomHandler handler;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        redisFanout = new RevealRoomRedisFanout();
        handler = new RevealRoomHandler(roomStore, objectMapper, redisFanout);
    }

    @Test
    void handleJoin_registersMemberAndReturnsState() throws Exception {
        WebSocketSession session = mockSession("room-1", "session-1", true);
        registerSession("room-1", session);
        when(roomStore.getState("room-1")).thenReturn(new RevealRoomStore.RoomState("room-1", 2, 5, "finale", 1234L, Set.of("host")));

        handler.handleJoin("room-1", session, objectMapper.readTree("""
                {"type":"join","memberId":"guest-1"}
                """));

        verify(roomStore).join("room-1", "guest-1");
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(session, atLeastOnce()).sendMessage(captor.capture());
        assertThat(captor.getValue().getPayload()).contains("\"type\":\"join\"");
        assertThat(captor.getValue().getPayload()).contains("\"memberId\":\"guest-1\"");
        assertThat(captor.getValue().getPayload()).contains("\"revealIndex\":2");
        assertThat(captor.getValue().getPayload()).contains("\"phase\":\"finale\"");
    }

    @Test
    void handleProgress_updatesStoreAndBroadcasts() throws Exception {
        WebSocketSession host = mockSession("room-2", "session-host", true);
        WebSocketSession guest = mockSession("room-2", "session-guest", true);
        host.getAttributes().put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_HOST);
        registerSession("room-2", host);
        registerSession("room-2", guest);

        when(roomStore.getState("room-2")).thenReturn(new RevealRoomStore.RoomState("room-2", 0, 10, "idle", 0L, Set.of()));
        handler.handleProgress("room-2", host, objectMapper.readTree("""
                {"type":"progress","revealIndex":3,"total":10,"phase":"summary","ts":9999}
                """));

        verify(roomStore).updateProgress("room-2", 3, 10, "summary", 9999L);
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(host).sendMessage(captor.capture());
        verify(guest).sendMessage(any(TextMessage.class));
        assertThat(captor.getValue().getPayload()).contains("\"type\":\"progress\"");
        assertThat(captor.getValue().getPayload()).contains("\"revealIndex\":3");
        assertThat(captor.getValue().getPayload()).contains("\"phase\":\"summary\"");
    }

    @Test
    void handleProgress_ignoredForSpectator() throws Exception {
        WebSocketSession spectator = mockSession("room-5", "session-spec", true);
        spectator.getAttributes().put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_SPECTATOR);
        registerSession("room-5", spectator);

        handler.handleProgress("room-5", spectator, objectMapper.readTree("""
                {"type":"progress","revealIndex":1,"phase":"playing","ts":100}
                """));

        org.mockito.Mockito.verify(roomStore, org.mockito.Mockito.never())
                .updateProgress(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyInt(),
                        org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyLong());
    }

    @Test
    void handleLeave_removesMemberAndBroadcasts() throws Exception {
        WebSocketSession session = mockSession("room-3", "session-3", true);
        registerSession("room-3", session);
        when(roomStore.getState("room-3")).thenReturn(new RevealRoomStore.RoomState("room-3", 0, 0, "idle", 0L, Set.of()));

        handler.handleJoin("room-3", session, objectMapper.readTree("""
                {"type":"join","memberId":"guest-2"}
                """));
        handler.handleLeave("room-3", session, objectMapper.readTree("""
                {"type":"leave","memberId":"guest-2"}
                """));

        verify(roomStore).leave("room-3", "guest-2");
        verify(session).close(any());
    }

    @Test
    void handleReaction_hostBroadcastsEmoji() throws Exception {
        WebSocketSession host = mockSession("room-6", "session-host-6", true);
        WebSocketSession guest = mockSession("room-6", "session-guest-6", true);
        host.getAttributes().put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_HOST);
        registerSession("room-6", host);
        registerSession("room-6", guest);
        when(roomStore.getState("room-6")).thenReturn(new RevealRoomStore.RoomState("room-6", 0, 0, "idle", 0L, Set.of()));
        handler.handleJoin("room-6", host, objectMapper.readTree("""
                {"type":"join","memberId":"host-6"}
                """));

        handler.handleReaction("room-6", host, objectMapper.readTree("""
                {"type":"reaction","emoji":"🔥"}
                """));

        verify(roomStore).addReaction(org.mockito.ArgumentMatchers.eq("room-6"),
                org.mockito.ArgumentMatchers.eq("host-6"),
                org.mockito.ArgumentMatchers.eq("🔥"),
                org.mockito.ArgumentMatchers.anyLong());
        ArgumentCaptor<TextMessage> guestCaptor = ArgumentCaptor.forClass(TextMessage.class);
        verify(guest, atLeastOnce()).sendMessage(guestCaptor.capture());
        assertThat(guestCaptor.getAllValues().stream().map(TextMessage::getPayload).anyMatch(p -> p.contains("\"type\":\"reaction\""))).isTrue();
    }

    @Test
    void handleLeave_hostPublishesIdleProgress() throws Exception {
        WebSocketSession host = mockSession("room-host-leave", "session-host-leave", true);
        WebSocketSession guest = mockSession("room-host-leave", "session-guest-leave", true);
        host.getAttributes().put(RevealRoomSessionAttributes.ROLE, RevealRoomSessionAttributes.ROLE_HOST);
        registerSession("room-host-leave", host);
        registerSession("room-host-leave", guest);
        when(roomStore.getState("room-host-leave"))
                .thenReturn(new RevealRoomStore.RoomState("room-host-leave", 2, 5, "playing", 100L, Set.of("host")));

        handler.handleJoin("room-host-leave", host, objectMapper.readTree("""
                {"type":"join","memberId":"host"}
                """));
        handler.handleLeave("room-host-leave", host, objectMapper.readTree("""
                {"type":"leave","memberId":"host"}
                """));

        verify(roomStore).updateProgress(eq("room-host-leave"), eq(2), eq(5), eq("idle"), org.mockito.ArgumentMatchers.anyLong());
        ArgumentCaptor<TextMessage> captor = ArgumentCaptor.forClass(TextMessage.class);
        verify(guest, atLeastOnce()).sendMessage(captor.capture());
        assertThat(captor.getAllValues().stream().map(TextMessage::getPayload).anyMatch(p -> p.contains("\"phase\":\"idle\""))).isTrue();
    }

    @Test
    void extractRoomId_parsesPathSuffix() {
        WebSocketSession session = mockSession("reveal_order-9", "session-9", false);
        assertThat(handler.extractRoomId(session)).isEqualTo("reveal_order-9");
    }

    @Test
    void afterConnectionClosed_leavesTrackedMember() throws Exception {
        WebSocketSession session = mockSession("room-4", "session-4", true);
        registerSession("room-4", session);
        when(roomStore.getState("room-4")).thenReturn(new RevealRoomStore.RoomState("room-4", 1, 3, "draw", 100L, Set.of("guest-4")));
        handler.handleJoin("room-4", session, objectMapper.readTree("""
                {"type":"join","memberId":"guest-4"}
                """));

        handler.afterConnectionClosed(session, CloseStatus.NORMAL);

        verify(roomStore).leave(eq("room-4"), eq("guest-4"));
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

    private void registerSession(String roomId, WebSocketSession session) throws Exception {
        handler.afterConnectionEstablished(session);
    }
}
