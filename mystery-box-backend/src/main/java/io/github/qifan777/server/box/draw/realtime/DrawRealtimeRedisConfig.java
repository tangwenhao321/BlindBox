package io.github.qifan777.server.box.draw.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.draw.realtime.redis.enabled", havingValue = "true", matchIfMissing = true)
public class DrawRealtimeRedisConfig {
    private final RedisConnectionFactory redisConnectionFactory;
    private final DrawRealtimeRedisSubscriber drawRealtimeRedisSubscriber;

    @Bean
    public RedisMessageListenerContainer drawRealtimeRedisListenerContainer() {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(redisConnectionFactory);
        container.addMessageListener(
                drawRealtimeRedisSubscriber,
                new ChannelTopic(DrawRealtimeBroadcaster.CHANNEL_POOL)
        );
        container.addMessageListener(
                drawRealtimeRedisSubscriber,
                new ChannelTopic(DrawRealtimeBroadcaster.CHANNEL_FEED)
        );
        return container;
    }
}
