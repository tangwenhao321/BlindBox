package io.github.qifan777.server.reveal.spectator;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class RevealSpectatorSessionStoreTest {

    private RevealSpectatorSessionStore store;

    @BeforeEach
    void setUp() {
        store = new RevealSpectatorSessionStore(new ObjectMapper());
    }

    @Test
    void updateByHost_mergesSnapshotAndPhase() {
        store.save("tok-1", new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-1",
                "box-1",
                "playing",
                new LinkedHashMap<>(Map.of("revealIndex", 0, "total", 2)),
                Instant.now().toEpochMilli() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        ));

        boolean updated = store.updateByHost(
                "tok-1",
                "host-a",
                "gap",
                Map.of("revealIndex", 1, "products", java.util.List.of(Map.of("id", "p1", "name", "Prize")))
        );

        assertThat(updated).isTrue();
        RevealSpectatorSessionStore.RevealSpectatorSession session = store.find("tok-1");
        assertThat(session).isNotNull();
        assertThat(session.phase()).isEqualTo("gap");
        assertThat(session.snapshot().get("revealIndex")).isEqualTo(1);
        assertThat(session.snapshot().get("total")).isEqualTo(2);
        assertThat(session.snapshot().get("products")).isNotNull();
    }

    @Test
    void updateByHost_rejectsForeignHost() {
        store.save("tok-2", new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-2",
                null,
                "playing",
                Map.of(),
                Instant.now().toEpochMilli() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        ));

        assertThat(store.updateByHost("tok-2", "host-b", "summary", Map.of())).isFalse();
    }

    @Test
    void findActiveTokenForOrder_returnsLatestToken() {
        store.save("tok-a", new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-a",
                "box-a",
                "playing",
                Map.of("total", 2),
                Instant.now().toEpochMilli() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        ));

        assertThat(store.findActiveTokenForOrder("host-a", "order-a")).contains("tok-a");
        assertThat(store.findActiveTokenForOrder("host-a", "order-b")).isEmpty();
    }

    @Test
    void updateByHost_refreshesExpiry() {
        long almostExpired = System.currentTimeMillis() + 1000;
        store.save("tok-3", new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-3",
                null,
                "playing",
                Map.of(),
                almostExpired
        ));

        assertThat(store.updateByHost("tok-3", "host-a", "gap", Map.of("revealIndex", 1))).isTrue();
        RevealSpectatorSessionStore.RevealSpectatorSession session = store.find("tok-3");
        assertThat(session).isNotNull();
        assertThat(session.expiresAtMs()).isGreaterThan(almostExpired + 1000);
    }

    @Test
    void find_returnsNullAfterRemove() {
        store.save("tok-rm", new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-rm",
                null,
                "playing",
                Map.of(),
                Instant.now().toEpochMilli() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        ));

        store.remove("tok-rm");

        assertThat(store.find("tok-rm")).isNull();
        assertThat(store.findActiveTokenForOrder("host-a", "order-rm")).isEmpty();
    }

    @Test
    void find_purgesExpiredSession() {
        store.save("tok-exp", new RevealSpectatorSessionStore.RevealSpectatorSession(
                "host-a",
                "order-exp",
                null,
                "summary",
                Map.of(),
                System.currentTimeMillis() - 1
        ));

        assertThat(store.find("tok-exp")).isNull();
    }
}
