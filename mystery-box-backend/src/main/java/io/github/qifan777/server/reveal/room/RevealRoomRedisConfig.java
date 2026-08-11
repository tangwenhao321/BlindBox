package io.github.qifan777.server.reveal.room;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@RequiredArgsConstructor
@ConditionalOnBean(RedisConnectionFactory.class)
public class RevealRoomRedisConfig {

    private final RedisConnectionFactory redisConnectionFactory;
    private final RevealRoomRedisSubscriber revealRoomRedisSubscriber;

    @Bean
    public RedisMessageListenerContainer revealRoomRedisListenerContainer() {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(redisConnectionFactory);
        container.addMessageListener(
                revealRoomRedisSubscriber,
                new PatternTopic(RevealRoomRedisFanout.CHANNEL_PREFIX + "*")
        );
        return container;
    }
}
