package io.github.qifan777.server.refund.service;

import com.github.binarywang.wxpay.bean.result.WxPayRefundQueryV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.pity.service.MysteryBoxUserPityService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.WxPayPropertiesExtension;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.gateway.PaymentRefundResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.refund.entity.RefundRecord;
import io.github.qifan777.server.refund.entity.RefundRecordDraft;
import io.github.qifan777.server.refund.repository.RefundRecordRepository;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.service.UserWalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RefundRecordServiceTest {

    @Mock private RefundRecordRepository refundRecordRepository;
    @Mock private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock private UserWalletService userWalletService;
    @Mock private UserNotificationService userNotificationService;
    @Mock private WxPayService wxPayService;
    @Mock private WxPayPropertiesExtension wxPayPropertiesExtension;
    @Mock private VNPayPaymentGateway vnpayPaymentGateway;
    @Mock private MarketProperties marketProperties;
    @Mock private MysteryBoxUserPityService mysteryBoxUserPityService;
    @Mock private PrizeStockService prizeStockService;
    @Mock private ObjectProvider<io.github.qifan777.server.warehouse.WarehouseShipService> warehouseShipService;
    @Mock private io.github.qifan777.server.warehouse.WarehouseShipService warehouseShip;
    @Mock private ReferralService referralService;

    @InjectMocks
    private RefundRecordService refundRecordService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(refundRecordService, "paymentMockEnabled", false);
        ReflectionTestUtils.setField(refundRecordService, "wxMchId", "xxxx-unset");
        lenient().when(warehouseShipService.getIfAvailable()).thenReturn(warehouseShip);
        lenient().when(refundRecordRepository.claimSuccess(anyString(), any())).thenReturn(true);
    }

    @Test
    void approve_vnPay_withWxUnset_doesNotWalletCredit_andRollsBackStock() {
        RefundRecord record = refundRecord("refund-vn-1", "order-vn-1", "用户申请退款");
        when(refundRecordRepository.findById(eq("refund-vn-1"), any())).thenReturn(Optional.of(record));
        MysteryBoxOrder order = orderWithPayType("order-vn-1", "user-1", DictConstants.PayType.VN_PAY, "vnp-tx-1");
        when(mysteryBoxOrderRepository.findByIdForFront("order-vn-1")).thenReturn(order);
        when(marketProperties.getCurrency()).thenReturn("VND");
        when(vnpayPaymentGateway.refund(
                eq("order-vn-1"), eq("vnp-tx-1"), eq("refund-vn-1"), any(BigDecimal.class), anyString()))
                .thenReturn(Optional.of(new PaymentRefundResult("refund-vn-1", "gw-ref-1", true, "ok")));

        refundRecordService.approve("refund-vn-1");

        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
        verify(vnpayPaymentGateway).refund(
                eq("order-vn-1"), eq("vnp-tx-1"), eq("refund-vn-1"), any(BigDecimal.class), anyString());
        verify(prizeStockService).rollbackByOrderId("order-vn-1");
        verify(warehouseShip).cancelPendingForOrder("order-vn-1");
        verify(mysteryBoxOrderRepository).changeStatus("order-vn-1", DictConstants.ProductOrderStatus.REFUNDED);
        verify(refundRecordRepository).claimSuccess("refund-vn-1", "gw-ref-1");
        verify(mysteryBoxUserPityService).clearOnRefund("user-1", "box-1");
    }

    @Test
    void approve_mockPath_creditsWallet_andRollsBackStock() {
        ReflectionTestUtils.setField(refundRecordService, "paymentMockEnabled", true);
        ReflectionTestUtils.setField(refundRecordService, "wxMchId", "real-mch");

        RefundRecord record = refundRecord("refund-mock-1", "order-mock-1", "用户申请退款");
        when(refundRecordRepository.findById(eq("refund-mock-1"), any())).thenReturn(Optional.of(record));
        MysteryBoxOrder order = orderWithPayType("order-mock-1", "user-2", DictConstants.PayType.WE_CHAT_PAY, null);
        when(mysteryBoxOrderRepository.findByIdForFront("order-mock-1")).thenReturn(order);
        when(marketProperties.getCurrency()).thenReturn("CNY");

        refundRecordService.approve("refund-mock-1");

        verify(userWalletService).credit(
                eq("user-2"), eq(BigDecimal.TEN), eq("REFUND"), anyString(), eq("order-mock-1"));
        verify(vnpayPaymentGateway, never()).refund(anyString(), any(), anyString(), any(), anyString());
        verify(prizeStockService).rollbackByOrderId("order-mock-1");
        verify(mysteryBoxOrderRepository).changeStatus("order-mock-1", DictConstants.ProductOrderStatus.REFUNDED);
        verify(refundRecordRepository).claimSuccess("refund-mock-1", null);
    }

    @Test
    void approve_pityStockReason_skipsClearPity() {
        ReflectionTestUtils.setField(refundRecordService, "paymentMockEnabled", true);

        RefundRecord record = refundRecord(
                "refund-pity-1", "order-pity-1", MysteryBoxUserPityService.COMPENSATE_CODE);
        when(refundRecordRepository.findById(eq("refund-pity-1"), any())).thenReturn(Optional.of(record));
        MysteryBoxOrder order = orderWithPayType(
                "order-pity-1", "user-3", DictConstants.PayType.WE_CHAT_PAY, null, false);
        when(mysteryBoxOrderRepository.findByIdForFront("order-pity-1")).thenReturn(order);
        when(marketProperties.getCurrency()).thenReturn("CNY");

        refundRecordService.approve("refund-pity-1");

        verify(prizeStockService).rollbackByOrderId("order-pity-1");
        verify(mysteryBoxUserPityService, never()).clearOnRefund(anyString(), anyString());
    }

    @Test
    void finalizeLocalRefundSuccess_skipStockRollback_onlyUpdatesStatuses() {
        RefundRecord record = refundRecord("refund-skip-1", "order-skip-1", "退款");
        MysteryBoxOrder order = orderWithPayType(
                "order-skip-1", "user-4", DictConstants.PayType.VN_PAY, "tx", true);

        refundRecordService.finalizeLocalRefundSuccess(record, order, "gw-skip", false);

        verify(prizeStockService, never()).rollbackByOrderId(anyString());
        verify(mysteryBoxOrderRepository).changeStatus("order-skip-1", DictConstants.ProductOrderStatus.REFUNDED);
        verify(refundRecordRepository).claimSuccess("refund-skip-1", "gw-skip");
        verify(mysteryBoxUserPityService).clearOnRefund("user-4", "box-1");
    }

    @Test
    void retryStuckRefunding_skipsTerminalStatus() {
        RefundRecord record = RefundRecordDraft.$.produce(draft -> draft
                .setId("refund-done")
                .setOrderId("order-done")
                .setReason("x")
                .setAmount(BigDecimal.TEN)
                .setStatus(DictConstants.RefundStatus.SUCCESS));
        when(refundRecordRepository.findById(eq("refund-done"), any())).thenReturn(Optional.of(record));

        assertThat(refundRecordService.retryStuckRefunding("refund-done")).isFalse();
        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void retryStuckRefunding_mockPath_creditsAndFinalizes() {
        ReflectionTestUtils.setField(refundRecordService, "paymentMockEnabled", true);
        RefundRecord record = refundRecord("refund-stuck-1", "order-stuck-1", "用户申请退款");
        when(refundRecordRepository.findById(eq("refund-stuck-1"), any())).thenReturn(Optional.of(record));
        MysteryBoxOrder order = orderWithPayType("order-stuck-1", "user-9", DictConstants.PayType.WE_CHAT_PAY, null);
        when(mysteryBoxOrderRepository.findByIdForFront("order-stuck-1")).thenReturn(order);

        assertThat(refundRecordService.retryStuckRefunding("refund-stuck-1")).isTrue();
        verify(userWalletService).credit(
                eq("user-9"), eq(BigDecimal.TEN), eq("REFUND"), anyString(), eq("order-stuck-1"));
        verify(warehouseShip).cancelPendingForOrder("order-stuck-1");
        verify(mysteryBoxOrderRepository).changeStatus("order-stuck-1", DictConstants.ProductOrderStatus.REFUNDED);
    }

    @Test
    void retryStuckRefunding_drawIntegrityEmpty_skipsAutoCredit() {
        ReflectionTestUtils.setField(refundRecordService, "paymentMockEnabled", true);
        RefundRecord record = refundRecord(
                "refund-die-1", "order-die-1", RefundRecordService.DRAW_INTEGRITY_EMPTY_REASON);
        when(refundRecordRepository.findById(eq("refund-die-1"), any())).thenReturn(Optional.of(record));
        MysteryBoxOrder order = orderWithPayType(
                "order-die-1", "user-die", DictConstants.PayType.WE_CHAT_PAY, null, false);
        when(mysteryBoxOrderRepository.findByIdForFront("order-die-1")).thenReturn(order);

        assertThat(refundRecordService.retryStuckRefunding("refund-die-1")).isFalse();
        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void retryStuckRefunding_weChatQuerySuccess_finalizesLocally() throws Exception {
        ReflectionTestUtils.setField(refundRecordService, "paymentMockEnabled", false);
        ReflectionTestUtils.setField(refundRecordService, "wxMchId", "real-mch-123");

        RefundRecord record = RefundRecordDraft.$.produce(draft -> draft
                .setId("refund-wx-1")
                .setOrderId("order-wx-1")
                .setReason("用户申请退款")
                .setAmount(BigDecimal.TEN)
                .setRefundId("wx-refund-existing")
                .setStatus(DictConstants.RefundStatus.REFUNDING));
        when(refundRecordRepository.findById(eq("refund-wx-1"), any())).thenReturn(Optional.of(record));
        MysteryBoxOrder order = orderWithPayType("order-wx-1", "user-wx", DictConstants.PayType.WE_CHAT_PAY, "tx-wx");
        when(mysteryBoxOrderRepository.findByIdForFront("order-wx-1")).thenReturn(order);

        WxPayRefundQueryV3Result queryResult = new WxPayRefundQueryV3Result();
        queryResult.setStatus("SUCCESS");
        queryResult.setRefundId("wx-refund-from-query");
        when(wxPayService.refundQueryV3("refund-wx-1")).thenReturn(queryResult);

        assertThat(refundRecordService.retryStuckRefunding("refund-wx-1")).isTrue();

        verify(wxPayService).refundQueryV3("refund-wx-1");
        verify(prizeStockService).rollbackByOrderId("order-wx-1");
        verify(warehouseShip).cancelPendingForOrder("order-wx-1");
        verify(mysteryBoxOrderRepository).changeStatus("order-wx-1", DictConstants.ProductOrderStatus.REFUNDED);
        verify(refundRecordRepository).claimSuccess("refund-wx-1", "wx-refund-from-query");
        verify(userWalletService, never()).credit(anyString(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void createDrawIntegrityEmptyRefundIfAbsent_createsWhenNoneExists() {
        MysteryBoxOrder order = orderWithPayType("order-empty-1", "user-e", DictConstants.PayType.VN_PAY, "tx");
        Payment payment = order.baseOrder().payment();
        when(payment.payAmount()).thenReturn(BigDecimal.valueOf(100));
        when(order.id()).thenReturn("order-empty-1");
        when(refundRecordRepository.existsRefundingOrSuccess("order-empty-1")).thenReturn(false);

        Optional<String> created = refundRecordService.createDrawIntegrityEmptyRefundIfAbsent(order);

        assertThat(created).isPresent();
        verify(refundRecordRepository).save(any(RefundRecord.class));
        verify(userNotificationService).push(
                eq("user-e"), eq("REFUND"), eq("订单异常处理中"), anyString(), eq("order-empty-1"));
    }

    private static RefundRecord refundRecord(String id, String orderId, String reason) {
        return RefundRecordDraft.$.produce(draft -> draft
                .setId(id)
                .setOrderId(orderId)
                .setReason(reason)
                .setAmount(BigDecimal.TEN)
                .setStatus(DictConstants.RefundStatus.REFUNDING));
    }

    private static MysteryBoxOrder orderWithPayType(
            String orderId, String userId, DictConstants.PayType payType, String tradeNo) {
        return orderWithPayType(orderId, userId, payType, tradeNo, true);
    }

    private static MysteryBoxOrder orderWithPayType(
            String orderId,
            String userId,
            DictConstants.PayType payType,
            String tradeNo,
            boolean withItems) {
        User user = org.mockito.Mockito.mock(User.class);
        when(user.id()).thenReturn(userId);

        Payment payment = org.mockito.Mockito.mock(Payment.class);
        when(payment.payType()).thenReturn(payType);
        if (tradeNo != null) {
            when(payment.tradeNo()).thenReturn(tradeNo);
        }

        BaseOrder baseOrder = org.mockito.Mockito.mock(BaseOrder.class);
        when(baseOrder.payment()).thenReturn(payment);

        MysteryBoxOrder order = org.mockito.Mockito.mock(MysteryBoxOrder.class);
        when(order.creator()).thenReturn(user);
        when(order.baseOrder()).thenReturn(baseOrder);
        if (withItems) {
            MysteryBoxOrderItem item = org.mockito.Mockito.mock(MysteryBoxOrderItem.class);
            when(item.mysteryBoxId()).thenReturn("box-1");
            when(order.items()).thenReturn(List.of(item));
        }
        return order;
    }
}
