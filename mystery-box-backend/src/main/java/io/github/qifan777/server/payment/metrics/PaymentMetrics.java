package io.github.qifan777.server.payment.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Micrometer counters for order creation and payment lifecycle events.
 */
@Component
public class PaymentMetrics {
    private final Counter ordersCreated;
    private final Counter paymentSuccess;
    private final Counter paymentFailure;
    private final Counter paymentNotifyRejected;

    public PaymentMetrics(MeterRegistry registry) {
        this.ordersCreated = Counter.builder("mystery_box.orders.created")
                .description("Mystery box orders created")
                .register(registry);
        this.paymentSuccess = Counter.builder("mystery_box.payment.success")
                .description("Successful payment completions")
                .register(registry);
        this.paymentFailure = Counter.builder("mystery_box.payment.failure")
                .description("Failed payment or prepay attempts")
                .register(registry);
        this.paymentNotifyRejected = Counter.builder("mystery_box.payment.notify.rejected")
                .description("Rejected or invalid payment notify callbacks")
                .register(registry);
    }

    public void orderCreated() {
        ordersCreated.increment();
    }

    public void paymentSuccess() {
        paymentSuccess.increment();
    }

    public void paymentFailure() {
        paymentFailure.increment();
    }

    public void paymentNotifyRejected() {
        paymentNotifyRejected.increment();
    }
}
