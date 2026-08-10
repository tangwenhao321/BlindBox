package io.github.qifan777.server.vip.order.service;

import cn.dev33.satoken.stp.StpUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.notify.WxPayNotifyV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.OrderIds;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.gateway.PaymentGateway;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.vip.order.entity.VipOrder;
import io.github.qifan777.server.vip.order.entity.VipOrderDraft;
import io.github.qifan777.server.vip.order.entity.dto.VipOrderInput;
import io.github.qifan777.server.vip.order.repository.VipOrderRepository;
import io.github.qifan777.server.vip.pack.entity.VipPackage;
import io.github.qifan777.server.vip.pack.repository.VipPackageRepository;
import io.github.qifan777.server.vip.root.entity.Vip;
import io.github.qifan777.server.vip.root.entity.VipDraft;
import io.github.qifan777.server.vip.root.repository.VipRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
@AllArgsConstructor
@Transactional
public class VipOrderService {
    private static final String WECHAT_NOTIFY_SUCCESS = "{\"code\":\"SUCCESS\",\"message\":\"成功\"}";
    private static final String VNPAY_NOTIFY_SUCCESS = "RspCode=00&Message=Confirm";
    private final VipOrderRepository vipOrderRepository;
    private final VipPackageRepository vipPackageRepository;
    private final VipRepository vipRepository;
    private final WxPayService wxPayService;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final MarketProperties marketProperties;
    private final VNPayPaymentGateway vnpayPaymentGateway;

    private Payment initPayment(BigDecimal price, String id) {
        return PaymentDraft.$.produce(draft -> {
            draft.setProductAmount(price)
                    .setPayType(paymentGatewayRegistry.resolveForMarket().payType())
                    .setCouponAmount(BigDecimal.ZERO)
                    .setVipAmount(BigDecimal.ZERO)
                    .setDeliveryFee(BigDecimal.ZERO)
                    .setPayAmount(price)
                    .setId(id);
        });
    }

    public Object save(VipOrderInput vipOrderInput) {
        VipPackage vipPackage = vipPackageRepository.findById(vipOrderInput.getVipPackageId()).orElseThrow(() -> new BusinessException(ResultCode.NotFindError));
        String orderId = OrderIds.next();
        VipOrder produce = VipOrderDraft.$.produce(vipOrderInput.toEntity(), draft -> {
            draft.setId(orderId)
                    .setUserId(StpUtil.getLoginIdAsString());
            draft.applyBaseOrder(baseOrderDraft -> {
                baseOrderDraft.setId(orderId)
                        .setPayment(initPayment(vipPackage.price(), orderId))
                        .setRemark("userId:" + StpUtil.getLoginIdAsString() + ";vipPackageId:" + vipPackage.id())
                        .setType(DictConstants.OrderType.VIP_ORDER)
                ;
            });
        });
        VipOrder activityOrder = vipOrderRepository.save(produce);
        PaymentGateway gateway = paymentGatewayRegistry.resolveForMarket();
        return gateway.prepay(activityOrder.baseOrder(), 5, notifyPathForMarket(), "127.0.0.1");
    }

    public Object prepay(String orderId, String clientIp) {
        VipOrder vipOrder = vipOrderRepository.findById(orderId, VipOrderRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
        if (!vipOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException("无权操作该订单");
        }
        if (vipOrder.baseOrder().payment().payTime() != null) {
            throw new BusinessException("订单已支付");
        }
        PaymentGateway gateway = paymentGatewayRegistry.resolveForMarket();
        return gateway.prepay(vipOrder.baseOrder(), 5, notifyPathForMarket(), clientIp);
    }

    @SneakyThrows
    public String paymentNotifyWechat(String body, SignatureHeader signatureHeader) {
        WxPayNotifyV3Result.DecryptNotifyResult notifyResult = wxPayService.parseOrderNotifyV3Result(
                        body, signatureHeader)
                .getResult();
        log.info("收到 VIP 微信支付回调通知，订单号：{}", notifyResult);
        completeAfterPayment(notifyResult.getOutTradeNo(), notifyResult.getOutTradeNo());
        return WECHAT_NOTIFY_SUCCESS;
    }

    public String paymentNotifyVNPay(Map<String, String> params) {
        Optional<PaymentNotifyResult> parsed = vnpayPaymentGateway.parsePaymentNotify(null, params);
        if (parsed.isEmpty()) {
            return "RspCode=97&Message=Invalid signature";
        }
        PaymentNotifyResult result = parsed.get();
        completeAfterPayment(result.orderId(), result.transactionId());
        return VNPAY_NOTIFY_SUCCESS;
    }

    private void completeAfterPayment(String outTradeNo, String tradeNo) {
        VipOrder vipOrder = vipOrderRepository.findById(outTradeNo, VipOrderRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
        if (vipOrder.baseOrder().payment().payTime() != null) {
            log.info("重复支付回调，忽略后续处理，vipOrderId={}", vipOrder.id());
            return;
        }
        StpUtil.switchTo(vipOrder.creator().id());
        Vip vip = vipRepository.findCurrentUserVip()
                .orElseGet(() ->
                        VipDraft.$.produce(draft -> {
                            draft.setUserId(StpUtil.getLoginIdAsString())
                                    .setEndTime(LocalDateTime.now());
                        }));
        vipRepository.save(VipDraft.$.produce(vip, draft -> {
            LocalDateTime endTime = LocalDateTime.now().isAfter(vip.endTime()) ? LocalDateTime.now() : vip.endTime();
            draft.setEndTime(endTime.plusDays(vipOrder.vipPackage().days()));
        }));
        vipOrderRepository.save(VipOrderDraft.$.produce(vipOrder, draft -> draft
                        .baseOrder()
                        .payment()
                        .setPayTime(LocalDateTime.now())
                        .setTradeNo(tradeNo == null ? outTradeNo : tradeNo)))
                .id();
    }

    private String notifyPathForMarket() {
        String provider = marketProperties.getPaymentProvider() == null
                ? "wechat"
                : marketProperties.getPaymentProvider().trim().toLowerCase(Locale.ROOT);
        if ("vnpay".equals(provider) || "vn_pay".equals(provider)) {
            return "/front/vip-order/notify/pay/vnpay";
        }
        return "/front/vip-order/notify/pay/wechat";
    }
}
