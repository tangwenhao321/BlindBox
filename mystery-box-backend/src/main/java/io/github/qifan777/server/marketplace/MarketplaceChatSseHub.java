package io.github.qifan777.server.marketplace;

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

/**
 * Listing-scoped SSE hub for marketplace C2C chat (push-on-change).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MarketplaceChatSseHub {
    private static final int MAX_GLOBAL_CONNECTIONS = 300;
    private static final int MAX_PER_LISTING = 40;
    private static final int MAX_PER_IP = 20;

    private final ClientIpResolver clientIpResolver;
    private final MarketplaceChatMetrics chatMetrics;
    private final ConcurrentHashMap<String, Set<SseEmitter>> chatEmitters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<SseEmitter, String> emitterIps = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicInteger> ipCounts = new ConcurrentHashMap<>();
    private final AtomicInteger globalConnections = new AtomicInteger();

    public void register(String listingId, SseEmitter emitter) {
        if (globalConnections.get() >= MAX_GLOBAL_CONNECTIONS) {
            chatMetrics.quotaRejected();
            throw new BusinessException("SSE_QUOTA_EXCEEDED: 实时连接过多，请稍后重试");
        }
        String ip = resolveIp();
        AtomicInteger ipCount = ipCounts.computeIfAbsent(ip, ignored -> new AtomicInteger());
        if (ipCount.get() >= MAX_PER_IP) {
            chatMetrics.quotaRejected();
            throw new BusinessException("SSE_QUOTA_EXCEEDED: 该网络连接过多，请稍后重试");
        }
        Set<SseEmitter> emitters = chatEmitters.computeIfAbsent(listingId, ignored -> ConcurrentHashMap.newKeySet());
        if (emitters.size() >= MAX_PER_LISTING) {
            chatMetrics.quotaRejected();
            throw new BusinessException("SSE_QUOTA_EXCEEDED: 该会话连接过多，请稍后重试");
        }
        if (emitters.add(emitter)) {
            globalConnections.incrementAndGet();
            emitterIps.put(emitter, ip);
            ipCount.incrementAndGet();
            chatMetrics.opened();
        }
    }

    public void unregister(String listingId, SseEmitter emitter) {
        Set<SseEmitter> emitters = chatEmitters.get(listingId);
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
            chatMetrics.closed();
        }
        if (emitters.isEmpty()) {
            chatEmitters.remove(listingId);
        }
    }

    public void broadcast(String listingId, String jsonPayload) {
        Set<SseEmitter> emitters = chatEmitters.get(listingId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        chatMetrics.broadcast();
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("CHAT_UPDATE").data(jsonPayload));
            } catch (Exception ex) {
                dead.add(emitter);
            }
        }
        dead.forEach(emitter -> unregister(listingId, emitter));
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
            log.debug("marketplace chat sse ip resolve failed: {}", ex.getMessage());
        }
        return "unknown";
    }
}
