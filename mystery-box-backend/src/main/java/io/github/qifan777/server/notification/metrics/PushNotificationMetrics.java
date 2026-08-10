package io.github.qifan777.server.notification.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class PushNotificationMetrics {
    private final Counter expoPushSent;
    private final Counter expoPushFailed;

    public PushNotificationMetrics(MeterRegistry registry) {
        this.expoPushSent = Counter.builder("mystery_box.push.expo.sent")
                .description("Expo push notifications sent")
                .register(registry);
        this.expoPushFailed = Counter.builder("mystery_box.push.expo.failed")
                .description("Expo push notification failures")
                .register(registry);
    }

    public void sent() {
        expoPushSent.increment();
    }

    public void failed() {
        expoPushFailed.increment();
    }
}
