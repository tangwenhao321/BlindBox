package io.github.qifan777.server.box.order.job;

import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.infrastructure.job.JobRunAuditService;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.vip.order.repository.VipOrderRepository;
import io.github.qifan777.server.vip.order.service.VipOrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentReconciliationJobTest {

    @Mock MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock MysteryBoxOrderService mysteryBoxOrderService;
    @Mock VipOrderRepository vipOrderRepository;
    @Mock VipOrderService vipOrderService;
    @Mock WxPayService wxPayService;
    @Mock VNPayPaymentGateway vnpayPaymentGateway;
    @Mock PaymentReliabilityService paymentReliabilityService;
    @Mock JobRunAuditService jobRunAuditService;

    @InjectMocks
    private PaymentReconciliationJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "mockPaymentEnabled", false);
        ReflectionTestUtils.setField(job, "minAgeMinutes", 10);
        ReflectionTestUtils.setField(job, "batchSize", 50);
        lenient().doAnswer(invocation -> {
            Runnable runnable = invocation.getArgument(1);
            runnable.run();
            return null;
        }).when(jobRunAuditService).runWithAudit(eq("PaymentReconciliationJob"), org.mockito.ArgumentMatchers.<Runnable>any());
    }

    @Test
    void skipsWhenMockPaymentEnabled() {
        ReflectionTestUtils.setField(job, "mockPaymentEnabled", true);
        job.reconcileStuckUnpaidOrders();
        verify(jobRunAuditService, never()).runWithAudit(
                eq("PaymentReconciliationJob"), org.mockito.ArgumentMatchers.<Runnable>any());
        verify(mysteryBoxOrderRepository, never()).findUnpaidOrdersBatch(any(Integer.class));
        verify(vipOrderRepository, never()).findUnpaidOrdersBatch(any(Integer.class));
    }

    @Test
    void scansBoxAndVipUnpaidBatchesWhenLive() {
        org.mockito.Mockito.when(mysteryBoxOrderRepository.findUnpaidOrdersBatch(50))
                .thenReturn(java.util.List.of());
        org.mockito.Mockito.when(vipOrderRepository.findUnpaidOrdersBatch(50))
                .thenReturn(java.util.List.of());
        job.reconcileStuckUnpaidOrders();
        verify(mysteryBoxOrderRepository).findUnpaidOrdersBatch(50);
        verify(vipOrderRepository).findUnpaidOrdersBatch(50);
    }
}
