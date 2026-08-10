package io.github.qifan777.server.box.draw.realtime;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class DrawRealtimeBroadcaster {
    public static final String CHANNEL_POOL = "draw:realtime:pool";
    public static final String CHANNEL_FEED = "draw:realtime:feed";

    private final StringRedisTemplate redisTemplate;

    public DrawRealtimeBroadcaster(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void publishPoolUpdate(String mysteryBoxId) {
        if (mysteryBoxId == null) {
            return;
        }
        bumpPoolVersion(mysteryBoxId);
        redisTemplate.convertAndSend(CHANNEL_POOL, mysteryBoxId);
    }

    public void bumpPoolVersion(String mysteryBoxId) {
        String key = "draw:pool:version:" + mysteryBoxId;
        redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, Duration.ofHours(1));
    }

    public long poolVersion(String mysteryBoxId) {
        String key = "draw:pool:version:" + mysteryBoxId;
        String val = redisTemplate.opsForValue().get(key);
        return val == null ? 0 : Long.parseLong(val);
    }

    public void publishFeedTick(String payload) {
        redisTemplate.convertAndSend(CHANNEL_FEED, payload == null ? "" : payload);
    }

    public void publishFeedUpdate(String boxIdOrGlobal) {
        String key = boxIdOrGlobal == null ? "global" : boxIdOrGlobal;
        bumpFeedVersion(key);
        redisTemplate.convertAndSend(CHANNEL_FEED, key);
    }

    public void bumpFeedVersion(String boxIdOrGlobal) {
        String key = "draw:feed:version:" + (boxIdOrGlobal == null ? "global" : boxIdOrGlobal);
        redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, Duration.ofHours(1));
    }

    public long feedVersion(String boxIdOrGlobal) {
        String key = "draw:feed:version:" + (boxIdOrGlobal == null ? "global" : boxIdOrGlobal);
        String val = redisTemplate.opsForValue().get(key);
        return val == null ? 0 : Long.parseLong(val);
    }
}
