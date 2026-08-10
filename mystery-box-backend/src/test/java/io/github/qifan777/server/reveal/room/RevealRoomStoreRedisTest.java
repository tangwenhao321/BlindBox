package io.github.qifan777.server.reveal.room;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevealRoomStoreRedisTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private SetOperations<String, String> setOperations;
    @Mock
    private HashOperations<String, Object, Object> hashOperations;

    private RevealRoomStore store;

    @BeforeEach
    void setUp() {
        store = new RevealRoomStore();
        ReflectionTestUtils.setField(store, "redisTemplate", redisTemplate);
        when(redisTemplate.opsForSet()).thenReturn(setOperations);
        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
    }

    @Test
    void leave_marksRoomIdleWhenLastMemberLeaves() {
        when(hashOperations.entries("reveal:room:room-redis")).thenReturn(Map.of(
                "revealIndex", "2",
                "total", "5",
                "phase", "playing",
                "ts", "1000"
        ));
        when(setOperations.remove("reveal:room:room-redis:members", "host-1")).thenReturn(1L);
        when(setOperations.size("reveal:room:room-redis:members")).thenReturn(0L);

        store.leave("room-redis", "host-1");

        org.mockito.ArgumentCaptor<Map<String, String>> captor = org.mockito.ArgumentCaptor.forClass(Map.class);
        verify(hashOperations).putAll(eq("reveal:room:room-redis"), captor.capture());
        assertThat(captor.getValue().get("phase")).isEqualTo("idle");
        assertThat(captor.getValue().get("revealIndex")).isEqualTo("2");
    }

    @Test
    void getState_fallsBackToEmptyIdleWhenRedisEmpty() {
        when(hashOperations.entries("reveal:room:missing")).thenReturn(Map.of());
        when(setOperations.members("reveal:room:missing:members")).thenReturn(Set.of());

        RevealRoomStore.RoomState state = store.getState("missing");

        assertThat(state.phase()).isEqualTo("idle");
        assertThat(state.members()).isEmpty();
    }
}
