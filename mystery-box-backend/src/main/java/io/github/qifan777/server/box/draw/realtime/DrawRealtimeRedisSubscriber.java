package io.github.qifan777.server.box.draw.realtime;

import tools.jackson.databind.json.JsonMapper;
import io.github.qifan777.server.box.draw.model.DrawFeedPageView;
import io.github.qifan777.server.box.draw.service.MysteryBoxDrawFeedService;
import io.github.qifan777.server.box.root.model.PoolDashboardView;
import io.github.qifan777.server.box.root.service.PoolDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DrawRealtimeRedisSubscriber implements MessageListener {
    private final DrawRealtimeSseHub sseHub;
    private final PoolDashboardService poolDashboardService;
    private final MysteryBoxDrawFeedService drawFeedService;
    private final JsonMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel());
        String body = new String(message.getBody());
        try {
            if (DrawRealtimeBroadcaster.CHANNEL_POOL.equals(channel)) {
                if (body.isBlank()) {
                    return;
                }
                PoolDashboardView dashboard = poolDashboardService.dashboard(body);
                sseHub.broadcastPool(body, objectMapper.writeValueAsString(dashboard));
                return;
            }
            if (DrawRealtimeBroadcaster.CHANNEL_FEED.equals(channel)) {
                String versionKey = body.isBlank() ? "global" : body;
                String boxId = "global".equals(versionKey) ? null : versionKey;
                DrawFeedPageView page = drawFeedService.feedPage(boxId, 5, null);
                sseHub.broadcastFeed(versionKey, objectMapper.writeValueAsString(page.items()));
            }
        } catch (Exception ex) {
            log.warn("Draw realtime redis message handling failed channel={}: {}", channel, ex.getMessage());
        }
    }
}
