package io.github.qifan777.server.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

@Configuration
public class SseSchedulerConfig {
    @Bean(destroyMethod = "shutdown")
    public ScheduledExecutorService sseScheduledExecutor(
            @Value("${app.sse.scheduler.pool-size:8}") int poolSize
    ) {
        int size = Math.max(1, poolSize);
        return Executors.newScheduledThreadPool(
                size,
                runnable -> {
                    Thread thread = new Thread(runnable, "sse-scheduler");
                    thread.setDaemon(true);
                    return thread;
                }
        );
    }
}
