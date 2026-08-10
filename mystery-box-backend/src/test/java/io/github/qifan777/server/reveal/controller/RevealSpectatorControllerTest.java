package io.github.qifan777.server.reveal.controller;

import io.github.qifan777.server.reveal.spectator.RevealSpectatorSessionStore;
import io.github.qifan777.server.reveal.spectator.RevealSpectatorSessionStore.RevealSpectatorSession;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevealSpectatorControllerTest {

    @Mock
    private RevealSpectatorSessionStore sessionStore;

    private RevealSpectatorController controller;

    @BeforeEach
    void setUp() {
        controller = new RevealSpectatorController(sessionStore);
    }

    @Test
    void getSpectatorReveal_throwsWhenExpired() {
        when(sessionStore.find("missing")).thenReturn(null);

        assertThatThrownBy(() -> controller.getSpectatorReveal("missing"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("REVEAL_SPECTATOR_EXPIRED");
    }

    @Test
    void getSpectatorReveal_returnsSnapshot() {
        when(sessionStore.find("tok-1")).thenReturn(new RevealSpectatorSession(
                "host-1",
                "order-1",
                "box-1",
                "playing",
                Map.of("total", 3, "revealIndex", 1),
                System.currentTimeMillis() + 60_000
        ));

        RevealSpectatorController.SpectatorRevealView view = controller.getSpectatorReveal("tok-1");

        assertThat(view.orderId()).isEqualTo("order-1");
        assertThat(view.phase()).isEqualTo("playing");
        assertThat(view.snapshot()).containsEntry("total", 3);
    }
}
