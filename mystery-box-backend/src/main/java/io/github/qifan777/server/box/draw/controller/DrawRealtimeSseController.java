package io.github.qifan777.server.box.draw.controller;



import cn.dev33.satoken.annotation.SaIgnore;

import cn.dev33.satoken.exception.NotLoginException;

import cn.dev33.satoken.stp.StpUtil;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.qifan777.server.box.draw.model.DrawFeedPageView;

import io.github.qifan777.server.box.draw.realtime.DrawRealtimeSseHub;

import io.github.qifan777.server.box.draw.service.MysteryBoxDrawFeedService;

import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;

import io.github.qifan777.server.box.root.model.PoolDashboardView;

import io.github.qifan777.server.box.root.service.PoolDashboardService;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Qualifier;

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

    private final ObjectMapper objectMapper;

    @Qualifier("sseScheduledExecutor")

    private final ScheduledExecutorService sseScheduledExecutor;



    @GetMapping(value = "mystery-box/{id}/draw-queue/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)

    public SseEmitter queueStream(@PathVariable String id) {

        if (!StpUtil.isLogin()) {

            throw new NotLoginException("login_required", null, null);

        }

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);

        ScheduledFuture<?> future = sseScheduledExecutor.scheduleAtFixedRate(() -> {

            try {

                if (!StpUtil.isLogin()) {

                    emitter.send(SseEmitter.event().name("error").data("login_required"));

                    emitter.complete();

                    return;

                }

                MysteryBoxDrawQueueService.QueueStatus status = drawQueueService.status(id, StpUtil.getLoginIdAsString());

                emitter.send(SseEmitter.event().name("QUEUE_STATUS").data(objectMapper.writeValueAsString(status)));

            } catch (Exception ex) {

                emitter.completeWithError(ex);

            }

        }, 0, 1, TimeUnit.SECONDS);

        registerCleanup(emitter, future);

        return emitter;

    }



    @SaIgnore

    @GetMapping(value = "mystery-box/draw-feed/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)

    public SseEmitter drawFeedStream(@RequestParam(required = false) String boxId) {

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



    private static void registerCleanup(SseEmitter emitter, ScheduledFuture<?> future) {

        Runnable cancel = () -> future.cancel(false);

        emitter.onCompletion(cancel);

        emitter.onTimeout(cancel);

        emitter.onError(error -> cancel.run());

    }



    private static void registerHubCleanup(SseEmitter emitter, ScheduledFuture<?> pingFuture, Runnable unregister) {

        Runnable cleanup = () -> {

            pingFuture.cancel(false);

            unregister.run();

        };

        emitter.onCompletion(cleanup);

        emitter.onTimeout(cleanup);

        emitter.onError(error -> cleanup.run());

    }

}


