package io.github.qifan777.server.box.draw.realtime;

import io.github.qifan777.server.infrastructure.util.ClientIpResolver;
import io.qifan.infrastructure.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@RequiredArgsConstructor
@Slf4j
public class DrawRealtimeSseHub {
    private static final int MAX_GLOBAL_CONNECTIONS = 500;
    private static final int MAX_PER_KEY = 80;
    private static final int MAX_PER_IP = 40;

    private final ClientIpResolver clientIpResolver;
    private final ConcurrentHashMap<String, Set<SseEmitter>> poolEmitters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<SseEmitter>> feedEmitters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<SseEmitter, String> emitterIps = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicInteger> ipCounts = new ConcurrentHashMap<>();
    private final AtomicInteger globalConnections = new AtomicInteger();

    public void registerPool(String mysteryBoxId, SseEmitter emitter) {
        register(poolEmitters, mysteryBoxId, emitter);
    }

    public void unregisterPool(String mysteryBoxId, SseEmitter emitter) {
        unregister(poolEmitters, mysteryBoxId, emitter);
    }

    public void registerFeed(String boxIdOrGlobal, SseEmitter emitter) {
        register(feedEmitters, boxIdOrGlobal, emitter);
    }

    public void unregisterFeed(String boxIdOrGlobal, SseEmitter emitter) {
        unregister(feedEmitters, boxIdOrGlobal, emitter);
    }

    public void broadcastPool(String mysteryBoxId, String jsonPayload) {
        broadcast(poolEmitters.get(mysteryBoxId), "POOL_UPDATE", jsonPayload, emitter -> unregisterPool(mysteryBoxId, emitter));
    }

    public void broadcastFeed(String boxIdOrGlobal, String jsonPayload) {
        broadcast(feedEmitters.get(boxIdOrGlobal), "DRAW_FEED", jsonPayload, emitter -> unregisterFeed(boxIdOrGlobal, emitter));
    }

    private void register(ConcurrentHashMap<String, Set<SseEmitter>> map, String key, SseEmitter emitter) {
        if (globalConnections.get() >= MAX_GLOBAL_CONNECTIONS) {
            throw new BusinessException("SSE_QUOTA_EXCEEDED: 实时连接过多，请稍后重试");
        }
        String ip = resolveIp();
        AtomicInteger ipCount = ipCounts.computeIfAbsent(ip, ignored -> new AtomicInteger());
        if (ipCount.get() >= MAX_PER_IP) {
            throw new BusinessException("SSE_QUOTA_EXCEEDED: 该网络连接过多，请稍后重试");
        }
        Set<SseEmitter> emitters = map.computeIfAbsent(key, ignored -> ConcurrentHashMap.newKeySet());
        if (emitters.size() >= MAX_PER_KEY) {
            throw new BusinessException("SSE_QUOTA_EXCEEDED: 该频道连接过多，请稍后重试");
        }
        if (emitters.add(emitter)) {
            globalConnections.incrementAndGet();
            emitterIps.put(emitter, ip);
            ipCount.incrementAndGet();
        }
    }

    private void unregister(ConcurrentHashMap<String, Set<SseEmitter>> map, String key, SseEmitter emitter) {
        Set<SseEmitter> emitters = map.get(key);
        if (emitters == null) {
            return;
        }
        if (emitters.remove(emitter)) {
            globalConnections.updateAndGet(n -> Math.max(0, n - 1));
            String ip = emitterIps.remove(emitter);
            if (ip != null) {
                AtomicInteger count = ipCounts.get(ip);
                if (count != null && count.decrementAndGet() <= 0) {
                    ipCounts.remove(ip, count);
                }
            }
        }
        if (emitters.isEmpty()) {
            map.remove(key);
        }
    }

    private String resolveIp() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                if (request != null) {
                    return clientIpResolver.resolve(request);
                }
            }
        } catch (Exception ex) {
            log.debug("sse ip resolve failed: {}", ex.getMessage());
        }
        return "unknown";
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
