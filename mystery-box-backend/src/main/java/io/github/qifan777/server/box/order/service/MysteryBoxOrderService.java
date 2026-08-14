package io.github.qifan777.server.box.order.service;

import cn.dev33.satoken.stp.StpUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.result.WxPayUnifiedOrderV3Result;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderInput;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.payment.entity.dto.PaymentCalculateView;
import io.github.qifan777.server.payment.gateway.MoMoPrepayView;
import io.github.qifan777.server.payment.gateway.VNPayPrepayView;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.box.product.service.PrizeStockService;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;

/**
 * Facade for mystery-box order flows. Public method signatures are stable;
 * create / cancel / redeem / logistics / draw / refund / payment-notify / prepay live in dedicated collaborators.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MysteryBoxOrderService {
    private final MysteryBoxOrderCreateService createService;
    private final MysteryBoxOrderCancelService cancelService;
    private final MysteryBoxOrderRedeemService redeemService;
    private final MysteryBoxOrderLogisticsService logisticsService;
    private final MysteryBoxOrderPrepayService prepayService;
    private final MysteryBoxOrderPaymentNotifyService paymentNotifyService;
    private final MysteryBoxOrderRefundService refundService;

    /**
     * 调用{@link #calculate(MysteryBoxOrderInput)}计算得到支付详情<br/>
     * 创建盲盒订单对象，盲盒订单项对象，基础订单对象
     * @param mysteryBoxOrderInput 订单输入
     * @return 订单id
     */
    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput) {
        return createService.create(mysteryBoxOrderInput);
    }

    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode) {
        return createService.create(mysteryBoxOrderInput, drawMode);
    }

    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode, Integer slotNo) {
        return createService.create(mysteryBoxOrderInput, drawMode, slotNo);
    }

    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode, Integer slotNo,
                         String recommendVariant) {
        return createService.create(mysteryBoxOrderInput, drawMode, slotNo, recommendVariant);
    }

    /**
     * @param recommendVariant optional A/B variant from home recommend carousel (header {@code x-recommend-variant}
     *                         or query {@code recommendVariant}). Persisted via analytics_event ORDER_CREATED
     *                         (no order meta JSON column).
     * @param clientFairnessNonce optional client entropy mixed into fairness commit (header {@code x-client-fairness-nonce}).
     */
    @Transactional
    public String create(MysteryBoxOrderInput mysteryBoxOrderInput, String drawMode, Integer slotNo,
                         String recommendVariant, String clientFairnessNonce) {
        return createService.create(mysteryBoxOrderInput, drawMode, slotNo, recommendVariant, clientFairnessNonce);
    }

    /**
     * 前端输入优惠券id，地址id，盲盒id，购买数量通过计算得到商品总价、优惠券价格、邮费、vip优惠、实付金额
     * @param mysteryBoxOrderInput 订单表单
     * @return 计算价格
     */
    public PaymentCalculateView calculate(MysteryBoxOrderInput mysteryBoxOrderInput) {
        return createService.calculate(mysteryBoxOrderInput);
    }

    public PaymentCalculateView calculate(MysteryBoxOrderInput mysteryBoxOrderInput, boolean autoCoupon, String retentionOrderId) {
        return createService.calculate(mysteryBoxOrderInput, autoCoupon, retentionOrderId);
    }

    @Transactional
    public VNPayPrepayView prepayVNPay(String id, String clientIp) {
        return prepayService.prepayVNPay(id, clientIp);
    }

    @Transactional
    public MoMoPrepayView prepayMoMo(String id, String clientIp) {
        return prepayService.prepayMoMo(id, clientIp);
    }

    @Transactional
    public WxPayUnifiedOrderV3Result.JsapiResult prepay(String id) {
        return prepayService.prepay(id);
    }

    @Transactional
    public String paymentNotifyVNPay(Map<String, String> params) {
        return paymentNotifyService.paymentNotifyVNPay(params);
    }

    @Transactional
    public String paymentNotifyMoMo(Map<String, String> params) {
        return paymentNotifyService.paymentNotifyMoMo(params);
    }

    @Transactional
    public String paymentNotifyWechat(String body, SignatureHeader signatureHeader) {
        return paymentNotifyService.paymentNotifyWechat(body, signatureHeader);
    }

    @Transactional
    public void reconcilePayment(String orderId, String transactionId, String eventType) {
        paymentNotifyService.reconcilePayment(orderId, transactionId, eventType);
    }

    @Transactional
    public String mockPay(String id) {
        return paymentNotifyService.mockPay(id);
    }

    /**
     * @deprecated Replaced by {@link PrizeStockService#drawAndConsume}. Kept only to fail loudly if still referenced.
     */
    @Deprecated
    @Transactional
    public List<ProductView> generateProducts(String mysteryBoxId, List<Product> products, int count) {
        throw new UnsupportedOperationException(
                "generateProducts is deprecated; use PrizeStockService.drawAndConsume");
    }

    @Transactional
    public String deliver(String id, String trackingNumber) {
        return logisticsService.deliver(id, trackingNumber);
    }

    @Transactional
    public String deliver(String id, String trackingNumber, String carrierCode) {
        return logisticsService.deliver(id, trackingNumber, carrierCode);
    }

    @Transactional
    public int batchDeliver(List<OrderLogisticsService.BatchShipLine> lines) {
        return logisticsService.batchDeliver(lines);
    }

    @Transactional
    public String confirmReceiveForUser(String id) {
        return logisticsService.confirmReceiveForUser(id);
    }

    /**
     * 用户在移动端取消未支付的订单
     * @param id 订单id
     * @return 订单id
     */
    @Transactional
    public String unpaidCancelForUser(String id) {
        return cancelService.unpaidCancelForUser(id);
    }

    @Transactional
    public String paidCancelForAdmin(String id) {
        return refundService.paidCancelForAdmin(id);
    }

    @Transactional
    public BigDecimal redeemToBalance(String id) {
        return redeemService.redeemToBalance(id);
    }

    @Transactional
    public String refundNotifyWeChat(String body, SignatureHeader signatureHeader) {
        return refundService.refundNotifyWeChat(body, signatureHeader);
    }

    public void checkStatus(MysteryBoxOrder mysteryBoxOrder, ProductOrderStatus... productOrderStatusList) {
        for (var status : productOrderStatusList) {
            if (mysteryBoxOrder.status().equals(status)) {
                return;
            }
        }
        throw new BusinessException(ResultCode.ParamSetIllegal, "订单状态不正确");
    }

    public void checkOwner(MysteryBoxOrder mysteryBoxOrder) {
        if (!mysteryBoxOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("非本人操作"));
        }
    }

}
