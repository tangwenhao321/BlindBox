package io.github.qifan777.server.infrastructure.config;

import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.data.redis.autoconfigure.DataRedisAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@AutoConfigureAfter(DataRedisAutoConfiguration.class)
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> stringObjectRedisTemplate(
            RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, Object> stringObjectRedisTemplate = new RedisTemplate<>();
        stringObjectRedisTemplate.setConnectionFactory(redisConnectionFactory);
        RedisSerializer<String> keySerializer = new StringRedisSerializer();
        RedisSerializer<Object> valueSerializer = GenericJacksonJsonRedisSerializer.create(builder -> {});
        stringObjectRedisTemplate.setKeySerializer(keySerializer);
        stringObjectRedisTemplate.setHashKeySerializer(keySerializer);
        stringObjectRedisTemplate.setValueSerializer(valueSerializer);
        stringObjectRedisTemplate.setHashValueSerializer(valueSerializer);
        stringObjectRedisTemplate.afterPropertiesSet();
        return stringObjectRedisTemplate;
    }
}
