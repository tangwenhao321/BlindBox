package io.github.qifan777.server.reveal.spectator;

import io.github.qifan777.server.reveal.controller.RevealSpectatorController;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class RevealSpectatorE2eFixtureIntegrationTest {

    @Autowired(required = false)
    private RevealSpectatorSessionStore sessionStore;

    @Autowired(required = false)
    private RevealSpectatorController controller;

    @Test
    void seededSpectatorTokenIsReadable() {
        Assumptions.assumeTrue(sessionStore != null && controller != null);
        RevealSpectatorSessionStore.RevealSpectatorSession session =
                sessionStore.find(RevealSpectatorE2eFixture.E2E_TOKEN);
        Assumptions.assumeTrue(session != null, "E2E fixture disabled — enable app.reveal.e2e-fixture.enabled=true");

        RevealSpectatorController.SpectatorRevealView view =
                controller.getSpectatorReveal(RevealSpectatorE2eFixture.E2E_TOKEN);

        assertThat(view.orderId()).isEqualTo(RevealSpectatorE2eFixture.E2E_ORDER_ID);
        assertThat(view.snapshot()).containsEntry("total", 3);
    }
}
