package io.github.qifan777.server.box.draw.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.exception.NotLoginException;
import cn.dev33.satoken.stp.StpUtil;
import tools.jackson.databind.json.JsonMapper;
import io.github.qifan777.server.box.draw.model.DrawFeedPageView;
import io.github.qifan777.server.box.draw.realtime.DrawRealtimeSseHub;
import io.github.qifan777.server.box.draw.service.MysteryBoxDrawFeedService;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.box.root.model.PoolDashboardView;
import io.github.qifan777.server.box.root.service.PoolDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("front")
@RequiredArgsConstructor
public class DrawRealtimeSseController {
    private static final long SSE_TIMEOUT_MS = 300_000L;
    private static final long PING_INTERVAL_SEC = 30L;

    private final MysteryBoxDrawQueueService drawQueueService;
    private final MysteryBoxDrawFeedService drawFeedService;
    private final PoolDashboardService poolDashboardService;
    private final DrawRealtimeSseHub sseHub;
    private final JsonMapper objectMapper;

    @Qualifier("sseScheduledExecutor")
    private final ScheduledExecutorService sseScheduledExecutor;

    /** When true, draw-feed and pool-stream require login (prod default). */
    @Value("${security.sse.require-auth:false}")
    private boolean sseRequireAuth;

    @GetMapping(value = "mystery-box/{id}/draw-queue/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter queueStream(@PathVariable String id) {
        assertLoggedIn();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        final String[] lastFingerprint = {null};
        ScheduledFuture<?> future = sseScheduledExecutor.scheduleAtFixedRate(() -> {
            try {
                if (!StpUtil.isLogin()) {
                    emitter.send(SseEmitter.event().name("error").data("login_required"));
                    emitter.complete();
                    return;
                }
                MysteryBoxDrawQueueService.QueueStatus status =
                        drawQueueService.status(id, StpUtil.getLoginIdAsString());
                String fingerprint = objectMapper.writeValueAsString(status);
                if (fingerprint.equals(lastFingerprint[0])) {
                    return;
                }
                lastFingerprint[0] = fingerprint;
                emitter.send(SseEmitter.event().name("QUEUE_STATUS").data(fingerprint));
            } catch (Exception ex) {
                emitter.completeWithError(ex);
            }
        }, 0, 3, TimeUnit.SECONDS);
        registerCleanup(emitter, future);
        return emitter;
    }

    @SaIgnore
    @GetMapping(value = "mystery-box/draw-feed/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter drawFeedStream(@RequestParam(required = false) String boxId) {
        assertSseAccess();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        String versionKey = boxId == null ? "global" : boxId;
        sseHub.registerFeed(versionKey, emitter);
        try {
            DrawFeedPageView page = drawFeedService.feedPage(boxId, 5, null);
            emitter.send(SseEmitter.event().name("DRAW_FEED").data(objectMapper.writeValueAsString(page.items())));
        } catch (Exception ex) {
            sseHub.unregisterFeed(versionKey, emitter);
            emitter.completeWithError(ex);
            return emitter;
        }
        ScheduledFuture<?> pingFuture = sseScheduledExecutor.scheduleAtFixedRate(() -> {
            try {
                emitter.send(SseEmitter.event().name("ping").data(""));
            } catch (Exception ex) {
                sseHub.unregisterFeed(versionKey, emitter);
                emitter.completeWithError(ex);
            }
        }, PING_INTERVAL_SEC, PING_INTERVAL_SEC, TimeUnit.SECONDS);
        registerHubCleanup(emitter, pingFuture, () -> sseHub.unregisterFeed(versionKey, emitter));
        return emitter;
    }

    @SaIgnore
    @GetMapping(value = "mystery-box/{id}/pool-stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter poolStream(@PathVariable String id) {
        // Pool inventory is more sensitive — always require login.
        assertLoggedIn();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        sseHub.registerPool(id, emitter);
        try {
            PoolDashboardView dashboard = poolDashboardService.dashboard(id);
            emitter.send(SseEmitter.event().name("POOL_UPDATE").data(objectMapper.writeValueAsString(dashboard)));
        } catch (Exception ex) {
            sseHub.unregisterPool(id, emitter);
            emitter.completeWithError(ex);
            return emitter;
        }
        ScheduledFuture<?> pingFuture = sseScheduledExecutor.scheduleAtFixedRate(() -> {
            try {
                emitter.send(SseEmitter.event().name("ping").data(""));
            } catch (Exception ex) {
                sseHub.unregisterPool(id, emitter);
                emitter.completeWithError(ex);
            }
        }, PING_INTERVAL_SEC, PING_INTERVAL_SEC, TimeUnit.SECONDS);
        registerHubCleanup(emitter, pingFuture, () -> sseHub.unregisterPool(id, emitter));
        return emitter;
    }

    private void assertSseAccess() {
        if (sseRequireAuth) {
            assertLoggedIn();
        }
    }

    private static void assertLoggedIn() {
        if (!StpUtil.isLogin()) {
            throw new NotLoginException("login_required", null, null);
        }
    }

    private static void registerCleanup(SseEmitter emitter, ScheduledFuture<?> future) {
        emitter.onCompletion(() -> future.cancel(true));
        emitter.onTimeout(() -> {
            future.cancel(true);
            emitter.complete();
        });
        emitter.onError((ex) -> future.cancel(true));
    }

    private static void registerHubCleanup(SseEmitter emitter, ScheduledFuture<?> pingFuture, Runnable unregister) {
        emitter.onCompletion(() -> {
            pingFuture.cancel(true);
            unregister.run();
        });
        emitter.onTimeout(() -> {
            pingFuture.cancel(true);
            unregister.run();
            emitter.complete();
        });
        emitter.onError((ex) -> {
            pingFuture.cancel(true);
            unregister.run();
        });
    }
}
