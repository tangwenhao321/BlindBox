package io.github.qifan777.server.box.draw.cache;

import io.github.qifan777.server.box.draw.realtime.DrawRealtimeBroadcaster;
import io.github.qifan777.server.box.draw.service.MysteryBoxDrawFeedService;
import io.github.qifan777.server.leaderboard.service.DrawLeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DrawPublicCacheInvalidator {
    private final MysteryBoxDrawFeedService mysteryBoxDrawFeedService;
    private final DrawLeaderboardService drawLeaderboardService;
    private final DrawRealtimeBroadcaster drawRealtimeBroadcaster;

    public void invalidateAfterDraw(String mysteryBoxId) {
        mysteryBoxDrawFeedService.invalidateCaches();
        drawLeaderboardService.invalidateCaches();
        drawRealtimeBroadcaster.publishFeedUpdate(mysteryBoxId);
        drawRealtimeBroadcaster.publishFeedUpdate(null);
        drawRealtimeBroadcaster.publishPoolUpdate(mysteryBoxId);
    }
}
