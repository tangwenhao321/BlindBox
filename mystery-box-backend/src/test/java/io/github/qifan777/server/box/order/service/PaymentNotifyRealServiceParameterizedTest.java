package io.github.qifan777.server.box.order.service;

import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.notify.WxPayNotifyV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.dict.model.ProductOrderStatus;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.metrics.PaymentMetrics;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentNotifyLogService;
import io.github.qifan777.server.payment.service.PaymentReliabilityService;
import io.github.qifan777.server.referral.service.ReferralService;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Real-service parameterized coverage for HV payment-notify catalog scenes.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PaymentNotifyRealServiceParameterizedTest {

    @Mock private WxPayService wxPayService;
    @Mock private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentReliabilityService paymentReliabilityService;
    @Mock private PaymentNotifyLogService paymentNotifyLogService;
    @Mock private PrizeStockService prizeStockService;
    @Mock private MysteryBoxUserPityService mysteryBoxUserPityService;
    @Mock private OrderLogisticsService orderLogisticsService;
    @Mock private UserNotificationService userNotificationService;
    @Mock private ReferralService referralService;
    @Mock private PaymentRetentionService paymentRetentionService;
    @Mock private PaymentMetrics paymentMetrics;
    @Mock private VNPayPaymentGateway vnpayPaymentGateway;
    @Mock private MoMoPaymentGateway momoPaymentGateway;
    @Mock private MysteryBoxOrderDrawService drawService;
    @Mock private MysteryBoxOrderRefundService refundService;
    @Mock private MysteryBoxOrderPrepayService prepayService;

    @InjectMocks
    private MysteryBoxOrderPaymentNotifyService paymentNotifyService;

    private MysteryBoxOrder stubOrder(String id, ProductOrderStatus status, BigDecimal payAmount) {
        MysteryBoxOrder order = mock(MysteryBoxOrder.class);
        BaseOrder baseOrder = mock(BaseOrder.class);
        Payment payment = mock(Payment.class);
        when(order.id()).thenReturn(id);
        when(order.status()).thenReturn(status);
        when(order.baseOrder()).thenReturn(baseOrder);
        when(baseOrder.payment()).thenReturn(payment);
        when(payment.payAmount()).thenReturn(payAmount);
        when(mysteryBoxOrderRepository.findByIdForFront(id)).thenReturn(order);
        return order;
    }

    @ParameterizedTest(name = "VNPay notify tryBegin={0}")
    @CsvSource({"true", "false"})
    void vnpayNotify_duplicateOrFirst(boolean tryBegin) {
        Map<String, String> params = new HashMap<>();
        params.put("vnp_TxnRef", "order-vnp");
        when(vnpayPaymentGateway.parsePaymentNotify(null, params))
                .thenReturn(Optional.of(new PaymentNotifyResult("order-vnp", "tx-1", 100000L)));
        when(paymentNotifyLogService.tryBegin("order-vnp", "tx-1", "vnpay", params.toString())).thenReturn(tryBegin);
        stubOrder("order-vnp", ProductOrderStatus.FINISHED, new BigDecimal("1000"));
        when(paymentRetentionService.matchesPayAmountAllowingStalePrepay(eq("order-vnp"), eq(100000L), any()))
                .thenReturn(true);
        when(paymentRetentionService.isStalePrepayOverpay(eq("order-vnp"), eq(100000L), any())).thenReturn(false);

        String response = paymentNotifyService.paymentNotifyVNPay(params);

        assertThat(response).contains("RspCode=00");
        if (tryBegin) {
            verify(paymentRetentionService).matchesPayAmountAllowingStalePrepay(eq("order-vnp"), eq(100000L), any());
        }
    }

    @ParameterizedTest(name = "WeChat amountMatch={0}")
    @CsvSource({"true", "false"})
    void wechatNotify_amountGate(boolean amountMatch) throws Exception {
        WxPayNotifyV3Result.DecryptNotifyResult decrypt =
                mock(WxPayNotifyV3Result.DecryptNotifyResult.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
        when(decrypt.getOutTradeNo()).thenReturn("order-amt");
        when(decrypt.getTransactionId()).thenReturn("wx-amt");
        when(decrypt.getAmount().getTotal()).thenReturn(100000);
        WxPayNotifyV3Result wrapper = mock(WxPayNotifyV3Result.class);
        when(wrapper.getResult()).thenReturn(decrypt);
        when(wxPayService.parseOrderNotifyV3Result(eq("body"), any(SignatureHeader.class))).thenReturn(wrapper);
        MysteryBoxOrder order = stubOrder(
                "order-amt",
                amountMatch ? ProductOrderStatus.FINISHED : ProductOrderStatus.TO_BE_PAID,
                new BigDecimal("1000"));
        when(paymentRetentionService.matchesPayAmountAllowingStalePrepay(eq("order-amt"), eq(100000L), any()))
                .thenReturn(amountMatch);
        when(paymentRetentionService.isStalePrepayOverpay(eq("order-amt"), eq(100000L), any())).thenReturn(false);

        if (amountMatch) {
            when(paymentNotifyLogService.tryBegin("order-amt", "wx-amt", "wechat", "body")).thenReturn(true);
            String response = paymentNotifyService.paymentNotifyWechat("body", SignatureHeader.builder().build());
            assertThat(response).contains("SUCCESS");
            verify(drawService, never()).drawPaidOrderItems(any());
            assertThat(order.status()).isEqualTo(ProductOrderStatus.FINISHED);
        } else {
            assertThatThrownBy(() -> paymentNotifyService.paymentNotifyWechat("body", SignatureHeader.builder().build()))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("金额");
            verify(paymentMetrics).paymentNotifyRejected();
            verify(drawService, never()).drawPaidOrderItems(any());
        }
    }

    @ParameterizedTest(name = "MoMo parseOk={0}")
    @CsvSource({"true", "false"})
    void momoNotify_signatureGate(boolean parseOk) {
        Map<String, String> params = Map.of("orderId", "order-momo");
        if (parseOk) {
            when(momoPaymentGateway.parsePaymentNotify(null, params))
                    .thenReturn(Optional.of(new PaymentNotifyResult("order-momo", "momo-tx", 50000L)));
            when(paymentNotifyLogService.tryBegin("order-momo", "momo-tx", "momo", params.toString())).thenReturn(true);
            stubOrder("order-momo", ProductOrderStatus.FINISHED, new BigDecimal("500"));
            when(paymentRetentionService.matchesPayAmountAllowingStalePrepay(eq("order-momo"), eq(50000L), any()))
                    .thenReturn(true);
            when(paymentRetentionService.isStalePrepayOverpay(eq("order-momo"), eq(50000L), any())).thenReturn(false);
            String response = paymentNotifyService.paymentNotifyMoMo(params);
            assertThat(response).contains("\"resultCode\":0");
        } else {
            when(momoPaymentGateway.parsePaymentNotify(null, params)).thenReturn(Optional.empty());
            String response = paymentNotifyService.paymentNotifyMoMo(params);
            assertThat(response).contains("\"resultCode\":1");
            verify(paymentMetrics).paymentNotifyRejected();
        }
    }
}