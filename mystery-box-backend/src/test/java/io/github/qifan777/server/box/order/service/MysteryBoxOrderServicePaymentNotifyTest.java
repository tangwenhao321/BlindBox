package io.github.qifan777.server.box.order.service;

import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.notify.WxPayNotifyV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.config.RedeemProperties;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.box.queue.service.MysteryBoxDrawQueueService;
import io.github.qifan777.server.box.slot.service.MysteryBoxPoolSlotService;
import io.github.qifan777.server.box.win.service.MysteryBoxWinRuleService;
import io.github.qifan777.server.box.pack.service.DrawPackConfigService;
import io.github.qifan777.server.box.root.service.NewcomerBoxService;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.carriage.service.CarriageTemplateService;
import io.github.qifan777.server.coupon.root.service.CouponService;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.order.repository.BaseOrderRepository;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentNotifyLogService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.payment.service.WeChatPayService;
import io.github.qifan777.server.ops.service.AnalyticsEventService;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.metrics.PaymentMetrics;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.user.compliance.UserComplianceService;
import io.github.qifan777.server.vip.root.service.VipService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MysteryBoxOrderServicePaymentNotifyTest {

    @Mock private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock private MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    @Mock private MysteryBoxRepository mysteryBoxRepository;
    @Mock private MysteryBoxUserPityService mysteryBoxUserPityService;
    @Mock private PrizeStockService prizeStockService;
    @Mock private MysteryBoxDrawQueueService mysteryBoxDrawQueueService;
    @Mock private MysteryBoxPoolSlotService mysteryBoxPoolSlotService;
    @Mock private MysteryBoxWinRuleService mysteryBoxWinRuleService;
    @Mock private DrawPackConfigService drawPackConfigService;
    @Mock private NewcomerBoxService newcomerBoxService;
    @Mock private AddressRepository addressRepository;
    @Mock private CarriageTemplateService carriageTemplateService;
    @Mock private CouponService couponService;
    @Mock private WxPayPropertiesExtension wxPayPropertiesExtension;
    @Mock private OrderLogisticsService orderLogisticsService;
    @Mock private UserNotificationService userNotificationService;
    @Mock private BaseOrderRepository baseOrderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentReliabilityService paymentReliabilityService;
    @Mock private AnalyticsEventService analyticsEventService;
    @Mock private PaymentNotifyLogService paymentNotifyLogService;
    @Mock private WeChatPayService weChatPayService;
    @Mock private ProductRepository productRepository;
    @Mock private ReferralService referralService;
    @Mock private RefundRecordRepository refundRecordRepository;
    @Mock private io.github.qifan777.server.refund.service.RefundRecordService refundRecordService;
    @Mock private UserComplianceService userComplianceService;
    @Mock private io.github.qifan777.server.user.compliance.UserSpendLimitService userSpendLimitService;
    @Mock private io.github.qifan777.server.user.compliance.MinorProtectionService minorProtectionService;
    @Mock private VipService vipService;
    @Mock private WxPayService wxPayService;
    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private PaymentRetentionService paymentRetentionService;
    @Mock private VNPayPaymentGateway vnpayPaymentGateway;
    @Mock private PaymentMetrics paymentMetrics;
    @Mock private MarketProperties marketProperties;
    @Mock private PaymentGatewayRegistry paymentGatewayRegistry;
    @Mock private io.github.qifan777.server.user.root.service.UserWalletService userWalletService;
    @Mock private org.springframework.transaction.PlatformTransactionManager transactionManager;
    @Mock private io.github.qifan777.server.payment.gateway.MoMoPaymentGateway momoPaymentGateway;
    @Mock private RedeemProperties redeemProperties;
    @Mock private OrderDrawMetaService orderDrawMetaService;
    @Mock private PurchaseLimitService purchaseLimitService;
    @Mock private org.springframework.beans.factory.ObjectProvider<io.github.qifan777.server.warehouse.WarehouseShipService> warehouseShipService;

    @InjectMocks
    private MysteryBoxOrderService mysteryBoxOrderService;

    @Test
    void paymentNotifyWechat_returnsWechatSuccessPayload() throws Exception {
        WxPayNotifyV3Result.DecryptNotifyResult decrypt =
                mock(WxPayNotifyV3Result.DecryptNotifyResult.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
        when(decrypt.getOutTradeNo()).thenReturn("order-paid-1");
        when(decrypt.getTransactionId()).thenReturn("wx-tx-1");
        when(decrypt.getAmount().getTotal()).thenReturn(100000);
        WxPayNotifyV3Result wrapper = mock(WxPayNotifyV3Result.class);
        when(wrapper.getResult()).thenReturn(decrypt);
        when(wxPayService.parseOrderNotifyV3Result(eq("body"), any(SignatureHeader.class))).thenReturn(wrapper);
        when(paymentNotifyLogService.tryBegin("order-paid-1", "wx-tx-1", "wechat", "body")).thenReturn(true);

        MysteryBoxOrder paidOrder = mock(MysteryBoxOrder.class);
        io.github.qifan777.server.order.entity.BaseOrder baseOrder = mock(io.github.qifan777.server.order.entity.BaseOrder.class);
        io.github.qifan777.server.payment.entity.Payment payment = mock(io.github.qifan777.server.payment.entity.Payment.class);
        when(paidOrder.baseOrder()).thenReturn(baseOrder);
        when(baseOrder.payment()).thenReturn(payment);
        when(payment.payAmount()).thenReturn(new java.math.BigDecimal("1000"));
        when(mysteryBoxOrderRepository.findByIdForFront("order-paid-1")).thenReturn(paidOrder);
        when(paidOrder.status()).thenReturn(io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus.FINISHED);
        when(paymentRetentionService.matchesPayAmountAllowingStalePrepay(eq("order-paid-1"), eq(100000L), any()))
                .thenReturn(true);

        String response = mysteryBoxOrderService.paymentNotifyWechat("body", SignatureHeader.builder().build());

        assertThat(response).contains("SUCCESS");
        verify(wxPayService).parseOrderNotifyV3Result(eq("body"), any(SignatureHeader.class));
        verify(mysteryBoxOrderRepository, org.mockito.Mockito.atLeastOnce()).findByIdForFront("order-paid-1");
    }

    @Test
    void paymentNotifyVNPay_returnsSuccessWhenParsed() {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_TxnRef", "order-vnpay-1");
        params.put("vnp_TransactionNo", "vnp-tx-1");
        params.put("vnp_ResponseCode", "00");
        when(vnpayPaymentGateway.parsePaymentNotify(null, params))
                .thenReturn(Optional.of(new PaymentNotifyResult("order-vnpay-1", "vnp-tx-1", 100000L)));
        when(vnpayPaymentGateway.matchesPayAmount(eq(100000L), any())).thenReturn(true);
        when(paymentNotifyLogService.tryBegin("order-vnpay-1", "vnp-tx-1", "vnpay", params.toString())).thenReturn(true);

        MysteryBoxOrder paidOrder = mock(MysteryBoxOrder.class);
        io.github.qifan777.server.order.entity.BaseOrder baseOrder = mock(io.github.qifan777.server.order.entity.BaseOrder.class);
        io.github.qifan777.server.payment.entity.Payment payment = mock(io.github.qifan777.server.payment.entity.Payment.class);
        when(paidOrder.baseOrder()).thenReturn(baseOrder);
        when(baseOrder.payment()).thenReturn(payment);
        when(payment.payAmount()).thenReturn(new java.math.BigDecimal("1000"));
        when(mysteryBoxOrderRepository.findByIdForFront("order-vnpay-1")).thenReturn(paidOrder);
        when(paidOrder.status()).thenReturn(io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus.FINISHED);

        String response = mysteryBoxOrderService.paymentNotifyVNPay(params);

        assertThat(response).contains("RspCode=00");
        verify(vnpayPaymentGateway).parsePaymentNotify(null, params);
        verify(vnpayPaymentGateway).matchesPayAmount(eq(100000L), any());
    }

    @Test
    void paymentNotifyVNPay_rejectsInvalidSignature() {
        Map<String, String> params = Map.of("vnp_TxnRef", "bad-order");
        when(vnpayPaymentGateway.parsePaymentNotify(null, params)).thenReturn(Optional.empty());

        String response = mysteryBoxOrderService.paymentNotifyVNPay(params);

        assertThat(response).contains("RspCode=97");
        verify(paymentMetrics).paymentNotifyRejected();
    }

    @Test
    void paymentNotifyWechat_abortsWhenClaimPaidFails() throws Exception {
        WxPayNotifyV3Result.DecryptNotifyResult decrypt =
                mock(WxPayNotifyV3Result.DecryptNotifyResult.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
        when(decrypt.getOutTradeNo()).thenReturn("order-cas-1");
        when(decrypt.getTransactionId()).thenReturn("wx-tx-cas");
        when(decrypt.getAmount().getTotal()).thenReturn(100000);
        WxPayNotifyV3Result wrapper = mock(WxPayNotifyV3Result.class);
        when(wrapper.getResult()).thenReturn(decrypt);
        when(wxPayService.parseOrderNotifyV3Result(eq("body"), any(SignatureHeader.class))).thenReturn(wrapper);
        when(paymentNotifyLogService.tryBegin("order-cas-1", "wx-tx-cas", "wechat", "body")).thenReturn(true);

        MysteryBoxOrder unpaid = mock(MysteryBoxOrder.class);
        io.github.qifan777.server.order.entity.BaseOrder baseOrder = mock(io.github.qifan777.server.order.entity.BaseOrder.class);
        io.github.qifan777.server.payment.entity.Payment payment = mock(io.github.qifan777.server.payment.entity.Payment.class);
        when(unpaid.baseOrder()).thenReturn(baseOrder);
        when(baseOrder.payment()).thenReturn(payment);
        when(payment.payAmount()).thenReturn(new java.math.BigDecimal("1000"));
        when(mysteryBoxOrderRepository.findByIdForFront("order-cas-1")).thenReturn(unpaid);
        when(unpaid.status()).thenReturn(io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus.TO_BE_PAID);
        when(unpaid.id()).thenReturn("order-cas-1");
        when(paymentRetentionService.matchesPayAmountAllowingStalePrepay(eq("order-cas-1"), eq(100000L), any()))
                .thenReturn(true);
        when(mysteryBoxOrderRepository.claimPaid("order-cas-1")).thenReturn(false);

        String response = mysteryBoxOrderService.paymentNotifyWechat("body", SignatureHeader.builder().build());

        assertThat(response).contains("SUCCESS");
        verify(mysteryBoxOrderRepository).claimPaid("order-cas-1");
        verify(prizeStockService, never()).drawAndConsume(anyString(), anyString(), anyString(), anyInt(), org.mockito.ArgumentMatchers.anyBoolean());
        verify(mysteryBoxRepository, never()).consumePool(anyString(), anyInt());
    }
}
