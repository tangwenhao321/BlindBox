package io.github.qifan777.server.box.draw.realtime;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class DrawRealtimeSseHub {
    private final ConcurrentHashMap<String, Set<SseEmitter>> poolEmitters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<SseEmitter>> feedEmitters = new ConcurrentHashMap<>();

    public void registerPool(String mysteryBoxId, SseEmitter emitter) {
        poolEmitters.computeIfAbsent(mysteryBoxId, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
    }

    public void unregisterPool(String mysteryBoxId, SseEmitter emitter) {
        Set<SseEmitter> emitters = poolEmitters.get(mysteryBoxId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            poolEmitters.remove(mysteryBoxId);
        }
    }

    public void registerFeed(String boxIdOrGlobal, SseEmitter emitter) {
        feedEmitters.computeIfAbsent(boxIdOrGlobal, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
    }

    public void unregisterFeed(String boxIdOrGlobal, SseEmitter emitter) {
        Set<SseEmitter> emitters = feedEmitters.get(boxIdOrGlobal);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            feedEmitters.remove(boxIdOrGlobal);
        }
    }

    public void broadcastPool(String mysteryBoxId, String jsonPayload) {
        broadcast(poolEmitters.get(mysteryBoxId), "POOL_UPDATE", jsonPayload, emitter -> unregisterPool(mysteryBoxId, emitter));
    }

    public void broadcastFeed(String boxIdOrGlobal, String jsonPayload) {
        broadcast(feedEmitters.get(boxIdOrGlobal), "DRAW_FEED", jsonPayload, emitter -> unregisterFeed(boxIdOrGlobal, emitter));
    }

    private static void broadcast(
            Set<SseEmitter> emitters,
            String eventName,
            String jsonPayload,
            java.util.function.Consumer<SseEmitter> onDead
    ) {
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(jsonPayload));
            } catch (Exception ex) {
                dead.add(emitter);
            }
        }
        dead.forEach(onDead);
    }
}
