package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.ProductOrderStatus;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.refund.service.RefundRecordService;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.service.UserWalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Real refund-service status gates for paid-after-cancel catalog scenes.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RefundPaidAfterCancelGateParameterizedTest {

    @Mock private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private RefundRecordRepository refundRecordRepository;
    @Mock private RefundRecordService refundRecordService;
    @Mock private PaymentReliabilityService paymentReliabilityService;
    @Mock private UserWalletService userWalletService;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private io.github.qifan777.server.infrastructure.util.ClientIpResolver clientIpResolver;
    @Mock private com.github.binarywang.wxpay.service.WxPayService wxPayService;
    @Mock private io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension wxPayPropertiesExtension;
    @Mock private io.github.qifan777.server.payment.gateway.VNPayPaymentGateway vnpayPaymentGateway;
    @Mock private io.github.qifan777.server.box.product.service.PrizeStockService prizeStockService;
    @Mock private OrderDrawMetaService orderDrawMetaService;
    @Mock private io.github.qifan777.server.notification.service.UserNotificationService userNotificationService;
    @Mock private io.github.qifan777.server.box.root.repository.MysteryBoxRepository mysteryBoxRepository;
    @Mock private org.springframework.beans.factory.ObjectProvider<io.github.qifan777.server.warehouse.WarehouseShipService> warehouseShipService;

    @InjectMocks
    private MysteryBoxOrderRefundService refundService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refundService, "paymentMockEnabled", true);
        ReflectionTestUtils.setField(refundService, "wxMchId", "xxxx-unset");
        when(clientIpResolver.resolveForRefund()).thenReturn("10.0.0.1");
        when(refundRecordRepository.existsRefundingOrSuccess(anyString())).thenReturn(false);
        // requiresNewTransaction field is TransactionTemplate — inject a no-op passthrough
        TransactionTemplate tt = new TransactionTemplate(transactionManager);
        ReflectionTestUtils.setField(refundService, "requiresNewTransaction", tt);
        when(transactionManager.getTransaction(any())).thenReturn(mock(org.springframework.transaction.TransactionStatus.class));
    }

    @ParameterizedTest(name = "paidAfterCancel status={0} expectProceed={1}")
    @CsvSource({
            "CLOSED,true",
            "TO_BE_PAID,true",
            "FINISHED,false",
            "TO_BE_DELIVERED,false",
            "TO_BE_RECEIVED,false"
    })
    void doExecutePaidAfterCancel_statusGate(ProductOrderStatus status, boolean expectProceed) {
        MysteryBoxOrder order = mock(MysteryBoxOrder.class);
        BaseOrder base = mock(BaseOrder.class);
        Payment payment = mock(Payment.class);
        User creator = mock(User.class);
        when(order.id()).thenReturn("order-pac");
        when(order.status()).thenReturn(status);
        when(order.creator()).thenReturn(creator);
        when(creator.id()).thenReturn("user-1");
        when(order.baseOrder()).thenReturn(base);
        when(base.payment()).thenReturn(payment);
        when(payment.payAmount()).thenReturn(new BigDecimal("10.00"));
        when(payment.payType()).thenReturn(io.github.qifan777.server.dict.model.PayType.WE_CHAT_PAY);
        when(mysteryBoxOrderRepository.findByIdForFront("order-pac")).thenReturn(order);
        when(refundRecordService.isVnPayChannel(any())).thenReturn(false);
        when(refundRecordService.isMoMoRefundUnsupported(any())).thenReturn(false);

        ReflectionTestUtils.invokeMethod(
                refundService,
                "doExecutePaidAfterCancelRefund",
                "order-pac",
                "tx-1",
                "test");

        if (expectProceed) {
            verify(refundRecordService).finalizeLocalRefundSuccess(any(), any(), any(), any(Boolean.class));
        } else {
            verify(refundRecordService, never()).finalizeLocalRefundSuccess(any(), any(), any(), any(Boolean.class));
            verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
        }
    }
}
