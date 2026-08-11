package io.github.qifan777.server.box.order.service;

import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pack.service.DrawPackConfigService;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.root.service.NewcomerBoxService;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.box.win.service.MysteryBoxWinRuleService;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.carriage.service.CarriageTemplateService;
import io.github.qifan777.server.coupon.root.service.CouponService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.order.repository.BaseOrderRepository;
import io.github.qifan777.server.ops.service.AnalyticsEventService;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.payment.gateway.PaymentRefundResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.metrics.PaymentMetrics;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentNotifyLogService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.payment.service.WeChatPayService;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.refund.service.RefundRecordService;
import io.github.qifan777.server.user.compliance.MinorProtectionService;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import io.github.qifan777.server.user.compliance.UserSpendLimitService;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.github.qifan777.server.vip.root.service.VipService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MysteryBoxOrderServiceRefundTest {

    @Mock private WxPayPropertiesExtension wxPayPropertiesExtension;
    @Mock private CouponService couponService;
    @Mock private CarriageTemplateService carriageTemplateService;
    @Mock private VipService vipService;
    @Mock private WeChatPayService weChatPayService;
    @Mock private WxPayService wxPayService;
    @Mock private ProductRepository productRepository;
    @Mock private MysteryBoxWinRuleService mysteryBoxWinRuleService;
    @Mock private AddressRepository addressRepository;
    @Mock private BaseOrderRepository baseOrderRepository;
    @Mock private MysteryBoxRepository mysteryBoxRepository;
    @Mock private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock private MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private RefundRecordRepository refundRecordRepository;
    @Mock private RefundRecordService refundRecordService;
    @Mock private PaymentReliabilityService paymentReliabilityService;
    @Mock private AnalyticsEventService analyticsEventService;
    @Mock private PaymentNotifyLogService paymentNotifyLogService;
    @Mock private NewcomerBoxService newcomerBoxService;
    @Mock private ReferralService referralService;
    @Mock private DrawPackConfigService drawPackConfigService;
    @Mock private PrizeStockService prizeStockService;
    @Mock private MysteryBoxUserPityService mysteryBoxUserPityService;
    @Mock private MysteryBoxDrawQueueService mysteryBoxDrawQueueService;
    @Mock private MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    @Mock private OrderDrawMetaService orderDrawMetaService;
    @Mock private OrderLogisticsService orderLogisticsService;
    @Mock private PurchaseLimitService purchaseLimitService;
    @Mock private UserComplianceService userComplianceService;
    @Mock private UserSpendLimitService userSpendLimitService;
    @Mock private MinorProtectionService minorProtectionService;
    @Mock private UserNotificationService userNotificationService;
    @Mock private PaymentRetentionService paymentRetentionService;
    @Mock private PaymentMetrics paymentMetrics;
    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private MarketProperties marketProperties;
    @Mock private PaymentGatewayRegistry paymentGatewayRegistry;
    @Mock private VNPayPaymentGateway vnpayPaymentGateway;
    @Mock private MoMoPaymentGateway momoPaymentGateway;
    @Mock private RedeemProperties redeemProperties;
    @Mock private UserWalletService userWalletService;
    @Mock private PlatformTransactionManager transactionManager;
    @Mock private org.springframework.beans.factory.ObjectProvider<io.github.qifan777.server.warehouse.WarehouseShipService> warehouseShipService;

    @InjectMocks
    private MysteryBoxOrderService mysteryBoxOrderService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(mysteryBoxOrderService, "paymentMockEnabled", false);
        ReflectionTestUtils.setField(mysteryBoxOrderService, "wxMchId", "xxxx-unset");
    }

    @Test
    void pityRefund_vnPay_withWxUnset_doesNotWalletCredit_andFinalizesSuccess() {
        MysteryBoxOrder order = order(
                "order-pity-vn",
                "user-1",
                DictConstants.ProductOrderStatus.TO_BE_DELIVERED,
                DictConstants.PayType.VN_PAY,
                "vnp-tx-1",
                true);
        when(mysteryBoxOrderRepository.findByIdForFront("order-pity-vn")).thenReturn(order);
        when(refundRecordService.isVnPayChannel(DictConstants.PayType.VN_PAY)).thenReturn(true);
        when(vnpayPaymentGateway.refund(
                eq("order-pity-vn"), eq("vnp-tx-1"), anyString(), any(BigDecimal.class), anyString()))
                .thenReturn(Optional.of(new PaymentRefundResult("refund-1", "gw-ref-1", true, "ok")));

        ReflectionTestUtils.invokeMethod(
                mysteryBoxOrderService,
                "doExecutePityStockGatewayRefund",
                "order-pity-vn",
                "vnp-tx-1",
                "vnpay");

        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
        ArgumentCaptor<RefundRecord> recordCaptor = ArgumentCaptor.forClass(RefundRecord.class);
        verify(refundRecordService).finalizeLocalRefundSuccess(
                recordCaptor.capture(), eq(order), eq("gw-ref-1"), eq(false));
        assertThat(recordCaptor.getValue().reason()).isEqualTo(MysteryBoxUserPityService.COMPENSATE_CODE);
        verify(mysteryBoxOrderRepository, never()).changeStatus(eq("order-pity-vn"), eq(DictConstants.ProductOrderStatus.CLOSED));
        verify(paymentReliabilityService).recordPaymentEvent(
                eq("user-1"), eq("order-pity-vn"), eq("vnpay"), eq("pity_stock_refund"), eq(""), eq(0));
    }

    @Test
    void pityRefund_vnPay_whenWxUnset_doesNotTakeWalletBranch() {
        // Same as above: isWxUnset=true but VN_PAY must not wallet-credit.
        MysteryBoxOrder order = order(
                "order-pity-vn2",
                "user-2",
                DictConstants.ProductOrderStatus.TO_BE_PAID,
                DictConstants.PayType.VN_PAY,
                "vnp-tx-2",
                true);
        when(mysteryBoxOrderRepository.findByIdForFront("order-pity-vn2")).thenReturn(order);
        when(refundRecordService.isVnPayChannel(DictConstants.PayType.VN_PAY)).thenReturn(true);
        when(vnpayPaymentGateway.refund(anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn(Optional.of(new PaymentRefundResult("r", "g", true, "ok")));

        ReflectionTestUtils.invokeMethod(
                mysteryBoxOrderService,
                "doExecutePityStockGatewayRefund",
                "order-pity-vn2",
                "vnp-tx-2",
                "vnpay");

        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
        verify(refundRecordService).finalizeLocalRefundSuccess(any(), eq(order), eq("g"), eq(false));
    }

    @Test
    void pityRefund_mockPath_creditsWallet_andFinalizes() {
        ReflectionTestUtils.setField(mysteryBoxOrderService, "paymentMockEnabled", true);
        MysteryBoxOrder order = order(
                "order-pity-mock",
                "user-3",
                DictConstants.ProductOrderStatus.TO_BE_DELIVERED,
                DictConstants.PayType.WE_CHAT_PAY,
                null,
                true);
        when(mysteryBoxOrderRepository.findByIdForFront("order-pity-mock")).thenReturn(order);
        when(refundRecordService.isVnPayChannel(DictConstants.PayType.WE_CHAT_PAY)).thenReturn(false);

        ReflectionTestUtils.invokeMethod(
                mysteryBoxOrderService,
                "doExecutePityStockGatewayRefund",
                "order-pity-mock",
                "mock-tx",
                "mock");

        verify(userWalletService).credit(
                eq("user-3"), eq(BigDecimal.TEN), eq("REFUND"), anyString(), eq("order-pity-mock"));
        verify(vnpayPaymentGateway, never()).refund(anyString(), any(), anyString(), any(), anyString());
        verify(refundRecordService).finalizeLocalRefundSuccess(any(), eq(order), isNull(), eq(false));
    }

    @Test
    void pityRefund_failure_keepsRefunding_andRecordsFailEvent() {
        MysteryBoxOrder order = order(
                "order-pity-fail",
                "user-4",
                DictConstants.ProductOrderStatus.TO_BE_PAID,
                DictConstants.PayType.VN_PAY,
                "vnp-fail",
                true);
        when(mysteryBoxOrderRepository.findByIdForFront("order-pity-fail")).thenReturn(order);
        when(refundRecordService.isVnPayChannel(DictConstants.PayType.VN_PAY)).thenReturn(true);
        when(vnpayPaymentGateway.refund(anyString(), anyString(), anyString(), any(), anyString()))
                .thenReturn(Optional.empty());

        ReflectionTestUtils.invokeMethod(
                mysteryBoxOrderService,
                "doExecutePityStockGatewayRefund",
                "order-pity-fail",
                "vnp-fail",
                "vnpay");

        verify(refundRecordRepository).save(any(RefundRecord.class));
        verify(mysteryBoxOrderRepository).changeStatus("order-pity-fail", DictConstants.ProductOrderStatus.CLOSED);
        verify(paymentReliabilityService).recordPaymentEvent(
                eq("user-4"), eq("order-pity-fail"), eq("vnpay"), eq("pity_stock_refund_fail"), anyString(), eq(0));
        verify(refundRecordService, never()).finalizeLocalRefundSuccess(any(), any(), any(), anyBoolean());
    }

    @Test
    void paidCancel_vnPay_finalizesSuccessWithoutSecondRollback() {
        MysteryBoxOrder order = order(
                "order-cancel-vn",
                "user-5",
                DictConstants.ProductOrderStatus.TO_BE_DELIVERED,
                DictConstants.PayType.VN_PAY,
                "vnp-cancel",
                false);
        when(mysteryBoxOrderRepository.findByIdForFront("order-cancel-vn")).thenReturn(order);
        when(refundRecordService.isVnPayChannel(DictConstants.PayType.VN_PAY)).thenReturn(true);
        when(vnpayPaymentGateway.refund(
                eq("order-cancel-vn"), eq("vnp-cancel"), anyString(), any(BigDecimal.class), anyString()))
                .thenReturn(Optional.of(new PaymentRefundResult("r", "gw-c", true, "ok")));

        String refundId = mysteryBoxOrderService.paidCancelForAdmin("order-cancel-vn");

        assertThat(refundId).isNotBlank();
        verify(prizeStockService).rollbackByOrderId("order-cancel-vn");
        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
        verify(refundRecordService).finalizeLocalRefundSuccess(any(), eq(order), eq("gw-c"), eq(false));
        verify(refundRecordRepository, never()).save(org.mockito.ArgumentMatchers.<RefundRecord>any());
    }

    @Test
    void paidCancel_mockPath_creditsWallet_andFinalizes() throws Exception {
        ReflectionTestUtils.setField(mysteryBoxOrderService, "paymentMockEnabled", true);
        MysteryBoxOrder order = order(
                "order-cancel-mock",
                "user-6",
                DictConstants.ProductOrderStatus.TO_BE_RECEIVED,
                DictConstants.PayType.WE_CHAT_PAY,
                null,
                false);
        when(mysteryBoxOrderRepository.findByIdForFront("order-cancel-mock")).thenReturn(order);
        when(refundRecordService.isVnPayChannel(DictConstants.PayType.WE_CHAT_PAY)).thenReturn(false);

        mysteryBoxOrderService.paidCancelForAdmin("order-cancel-mock");

        verify(prizeStockService).rollbackByOrderId("order-cancel-mock");
        verify(userWalletService).credit(
                eq("user-6"), eq(BigDecimal.TEN), eq("REFUND"), anyString(), eq("order-cancel-mock"));
        verify(refundRecordService).finalizeLocalRefundSuccess(any(), eq(order), isNull(), eq(false));
        verify(wxPayService, never()).refundV3(org.mockito.ArgumentMatchers.any());
    }

    private static MysteryBoxOrder order(
            String orderId,
            String userId,
            DictConstants.ProductOrderStatus status,
            DictConstants.PayType payType,
            String tradeNo,
            boolean withItems
    ) {
        User user = org.mockito.Mockito.mock(User.class);
        when(user.id()).thenReturn(userId);

        Payment payment = org.mockito.Mockito.mock(Payment.class);
        when(payment.payType()).thenReturn(payType);
        when(payment.payAmount()).thenReturn(BigDecimal.TEN);
        if (tradeNo != null) {
            when(payment.tradeNo()).thenReturn(tradeNo);
        }

        BaseOrder baseOrder = org.mockito.Mockito.mock(BaseOrder.class);
        when(baseOrder.payment()).thenReturn(payment);

        MysteryBoxOrder order = org.mockito.Mockito.mock(MysteryBoxOrder.class);
        when(order.creator()).thenReturn(user);
        when(order.baseOrder()).thenReturn(baseOrder);
        when(order.status()).thenReturn(status);
        if (withItems) {
            MysteryBoxOrderItem item = org.mockito.Mockito.mock(MysteryBoxOrderItem.class);
            when(item.mysteryBoxId()).thenReturn("box-1");
            when(order.items()).thenReturn(List.of(item));
        }
        return order;
    }
}
