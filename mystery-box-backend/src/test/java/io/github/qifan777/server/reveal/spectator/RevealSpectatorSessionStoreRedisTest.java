package io.github.qifan777.server.reveal.spectator;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class RevealSpectatorSessionStoreRedisTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private RevealSpectatorSessionStore store;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        store = new RevealSpectatorSessionStore(objectMapper);
        ReflectionTestUtils.setField(store, "redisTemplate", redisTemplate);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void save_writesSessionAndOrderIndexToRedis() throws Exception {
        RevealSpectatorSessionStore.RevealSpectatorSession session = new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-redis",
                "box-a",
                "playing",
                Map.of("total", 2),
                Instant.now().toEpochMilli() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        );

        store.save("tok-redis", session);

        verify(valueOperations).set(eq("reveal:spectator:tok-redis"), anyString(), any());
        verify(valueOperations).set(eq("reveal:spectator:order:host-a:order-redis"), eq("tok-redis"), any());
    }

    @Test
    void find_fallsBackToMemoryWhenRedisReadFails() {
        doThrow(new RuntimeException("redis write failed"))
                .when(valueOperations).set(anyString(), anyString(), any());
        store.save("tok-mem", new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-mem",
                null,
                "playing",
                Map.of(),
                System.currentTimeMillis() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        ));
        when(valueOperations.get("reveal:spectator:tok-mem")).thenThrow(new RuntimeException("redis down"));

        assertThat(store.find("tok-mem")).isNotNull();
    }
}
