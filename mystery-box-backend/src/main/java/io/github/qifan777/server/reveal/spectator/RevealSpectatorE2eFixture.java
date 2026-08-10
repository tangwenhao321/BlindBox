package io.github.qifan777.server.reveal.spectator;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Seeds a fixed spectator token for Maestro E2E ({@code e2e-spectator}).
 */
@Component
@ConditionalOnProperty(name = "app.reveal.e2e-fixture.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class RevealSpectatorE2eFixture {

    public static final String E2E_TOKEN = "e2e-spectator";
    public static final String E2E_ORDER_ID = "e2e-smoke-order";

    private final RevealSpectatorSessionStore sessionStore;

    @PostConstruct
    void seed() {
        sessionStore.save(E2E_TOKEN, new RevealSpectatorSessionStore.RevealSpectatorSession(
                "e2e-host",
                E2E_ORDER_ID,
                "e2e-box",
                "playing",
                Map.of(
                        "productId", "e2e-product-2",
                        "productName", "E2E Hidden Prize",
                        "revealIndex", 1,
                        "total", 3,
                        "qualityType", "HIDDEN",
                        "products", List.of(
                                Map.of(
                                        "id", "e2e-product-1",
                                        "name", "E2E Common Prize",
                                        "qualityType", "GENERAL"
                                ),
                                Map.of(
                                        "id", "e2e-product-2",
                                        "name", "E2E Hidden Prize",
                                        "qualityType", "HIDDEN"
                                ),
                                Map.of(
                                        "id", "e2e-product-3",
                                        "name", "E2E Smoke Prize",
                                        "qualityType", "LEGEND"
                                )
                        )
                ),
                Instant.now().toEpochMilli() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        ));
        log.info("Reveal spectator E2E fixture seeded token={} orderId={}", E2E_TOKEN, E2E_ORDER_ID);
    }
}
