package io.github.qifan777.server.reveal.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.reveal.spectator.RevealSpectatorSessionStore;
import io.github.qifan777.server.reveal.spectator.RevealSpectatorSessionStore.RevealSpectatorSession;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("front/reveal")
@RequiredArgsConstructor
public class RevealSpectatorController {

    private final RevealSpectatorSessionStore sessionStore;

    @PostMapping("spectator-token")
    public SpectatorTokenView createSpectatorToken(@RequestBody(required = false) SpectatorTokenRequest request) {
        StpUtil.checkLogin();
        String hostUserId = StpUtil.getLoginIdAsString();
        SpectatorTokenRequest payload = request == null ? new SpectatorTokenRequest(null, null, null, Map.of()) : request;
        if (payload.orderId() != null && !payload.orderId().isBlank()) {
            Optional<String> existing = sessionStore.findActiveTokenForOrder(hostUserId, payload.orderId());
            if (existing.isPresent()) {
                sessionStore.updateByHost(
                        existing.get(),
                        hostUserId,
                        payload.phase(),
                        snapshotOrEmpty(payload.snapshot())
                );
                return new SpectatorTokenView(existing.get());
            }
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        sessionStore.save(token, new RevealSpectatorSession(
                hostUserId,
                payload.orderId(),
                payload.boxId(),
                payload.phase(),
                snapshotOrEmpty(payload.snapshot()),
                Instant.now().toEpochMilli() + RevealSpectatorSessionStore.TOKEN_TTL_MS
        ));
        return new SpectatorTokenView(token);
    }

    @GetMapping("spectator-token/active/{orderId}")
    public SpectatorTokenView getActiveSpectatorToken(@PathVariable String orderId) {
        StpUtil.checkLogin();
        return sessionStore.findActiveTokenForOrder(StpUtil.getLoginIdAsString(), orderId)
                .map(SpectatorTokenView::new)
                .orElseThrow(() -> new BusinessException("REVEAL_SPECTATOR_NOT_FOUND"));
    }

    @PatchMapping("spectator/{token}")
    public SpectatorTokenView updateSpectatorToken(
            @PathVariable String token,
            @RequestBody(required = false) SpectatorUpdateRequest request
    ) {
        StpUtil.checkLogin();
        SpectatorUpdateRequest payload = request == null ? new SpectatorUpdateRequest(null, Map.of()) : request;
        boolean updated = sessionStore.updateByHost(
                token,
                StpUtil.getLoginIdAsString(),
                payload.phase(),
                snapshotOrEmpty(payload.snapshot())
        );
        if (!updated) {
            throw new BusinessException("REVEAL_SPECTATOR_FORBIDDEN");
        }
        return new SpectatorTokenView(token);
    }

    @SaIgnore
    @GetMapping("spectator/{token}")
    public SpectatorRevealView getSpectatorReveal(@PathVariable String token) {
        RevealSpectatorSession session = sessionStore.find(token);
        if (session == null) {
            throw new BusinessException("REVEAL_SPECTATOR_EXPIRED");
        }
        return new SpectatorRevealView(
                session.hostUserId(),
                session.orderId(),
                session.boxId(),
                session.phase(),
                session.snapshot()
        );
    }

    private static Map<String, Object> snapshotOrEmpty(Map<String, Object> snapshot) {
        if (snapshot == null || snapshot.isEmpty()) {
            return Map.of();
        }
        return new LinkedHashMap<>(snapshot);
    }

    public record SpectatorTokenRequest(
            String orderId,
            String boxId,
            String phase,
            Map<String, Object> snapshot
    ) {
    }

    public record SpectatorUpdateRequest(
            String phase,
            Map<String, Object> snapshot
    ) {
    }

    public record SpectatorTokenView(String token) {
    }

    public record SpectatorRevealView(
            String hostUserId,
            String orderId,
            String boxId,
            String phase,
            Map<String, Object> snapshot
    ) {
    }
}
