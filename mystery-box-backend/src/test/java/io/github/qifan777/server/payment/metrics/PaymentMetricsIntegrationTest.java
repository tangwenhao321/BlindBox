package io.github.qifan777.server.payment.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PaymentMetricsIntegrationTest {

    @Autowired
    private PaymentMetrics paymentMetrics;

    @Autowired
    private MeterRegistry meterRegistry;

    @Test
    void paymentCountersIncrementInRegistry() {
        double createdBefore = counter("mystery_box.orders.created");
        double successBefore = counter("mystery_box.payment.success");
        double failureBefore = counter("mystery_box.payment.failure");
        double rejectedBefore = counter("mystery_box.payment.notify.rejected");

        paymentMetrics.orderCreated();
        paymentMetrics.paymentSuccess();
        paymentMetrics.paymentFailure();
        paymentMetrics.paymentNotifyRejected();

        assertThat(counter("mystery_box.orders.created")).isEqualTo(createdBefore + 1);
        assertThat(counter("mystery_box.payment.success")).isEqualTo(successBefore + 1);
        assertThat(counter("mystery_box.payment.failure")).isEqualTo(failureBefore + 1);
        assertThat(counter("mystery_box.payment.notify.rejected")).isEqualTo(rejectedBefore + 1);
    }

    private double counter(String name) {
        return meterRegistry.get(name).counter().count();
    }
}
