package io.github.qifan777.server.vip.order.service;

import cn.dev33.satoken.stp.StpUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.notify.WxPayNotifyV3Result;
import com.github.binarywang.wxpay.service.WxPayService;
import io.github.qifan777.server.box.order.OrderIds;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.error.MoneyPathErrorCode;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.MoMoPrepayView;
import io.github.qifan777.server.payment.gateway.PaymentGateway;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.payment.gateway.PaymentNotifyResult;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.PaymentNotifyLogService;
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
import org.springframework.util.StringUtils;

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
    private final MoMoPaymentGateway momoPaymentGateway;
    private final PaymentNotifyLogService paymentNotifyLogService;
    private final PaymentRepository paymentRepository;

    private Payment initPayment(BigDecimal price, String id) {
        BigDecimal rounded = MoneyRounding.round(price, marketProperties.getCurrency());
        return PaymentDraft.$.produce(draft -> {
            draft.setProductAmount(rounded)
                    .setPayType(paymentGatewayRegistry.resolveForMarket().payType())
                    .setCouponAmount(BigDecimal.ZERO)
                    .setVipAmount(BigDecimal.ZERO)
                    .setDeliveryFee(BigDecimal.ZERO)
                    .setPayAmount(rounded)
                    .setId(id);
        });
    }

    public Object save(VipOrderInput vipOrderInput, String clientIp) {
        VipOrder activityOrder = createUnpaid(vipOrderInput);
        PaymentGateway gateway = paymentGatewayRegistry.resolveForMarket();
        return gateway.prepay(activityOrder.baseOrder(), 5, notifyPathForMarket(), clientIp);
    }

    /** Create unpaid VIP order (no gateway prepay) — use with channel-specific prepay endpoints. */
    public VipOrder createUnpaid(VipOrderInput vipOrderInput) {
        VipPackage vipPackage = vipPackageRepository.findById(vipOrderInput.getVipPackageId())
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError));
        String orderId = OrderIds.next();
        VipOrder produce = VipOrderDraft.$.produce(vipOrderInput.toEntity(), draft -> {
            draft.setId(orderId)
                    .setUserId(StpUtil.getLoginIdAsString());
            draft.applyBaseOrder(baseOrderDraft -> {
                baseOrderDraft.setId(orderId)
                        .setPayment(initPayment(vipPackage.price(), orderId))
                        .setRemark("userId:" + StpUtil.getLoginIdAsString() + ";vipPackageId:" + vipPackage.id())
                        .setType(DictConstants.OrderType.VIP_ORDER);
            });
        });
        return vipOrderRepository.save(produce);
    }

    public Object prepay(String orderId, String clientIp) {
        VipOrder vipOrder = requireUnpaidOwnedOrder(orderId);
        PaymentGateway gateway = paymentGatewayRegistry.resolveForMarket();
        return gateway.prepay(vipOrder.baseOrder(), 5, notifyPathForMarket(), clientIp);
    }

    public MoMoPrepayView prepayMoMo(String orderId, String clientIp) {
        VipOrder vipOrder = requireUnpaidOwnedOrder(orderId);
        return momoPaymentGateway.prepay(
                vipOrder.baseOrder(),
                5,
                "/front/vip-order/notify/pay/momo",
                clientIp);
    }

    /** Dev/integration: mark unpaid VIP order paid without a gateway (requires app.payment.mock-enabled). */
    public String mockPay(String orderId) {
        requireUnpaidOwnedOrder(orderId);
        completeAfterPayment(orderId, "mock-" + orderId);
        log.info("VIP mock pay completed orderId={}", orderId);
        return orderId;
    }

    private VipOrder requireUnpaidOwnedOrder(String orderId) {
        VipOrder vipOrder = vipOrderRepository.findById(orderId, VipOrderRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
        if (!vipOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException(
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED,
                    MoneyPathErrorCode.ORDER_OWNERSHIP_DENIED.tokenMessage("无权操作该订单"));
        }
        if (vipOrder.baseOrder().payment().payTime() != null) {
            throw new BusinessException("订单已支付");
        }
        return vipOrder;
    }

    @SneakyThrows
    public String paymentNotifyWechat(String body, SignatureHeader signatureHeader) {
        WxPayNotifyV3Result.DecryptNotifyResult notifyResult = wxPayService.parseOrderNotifyV3Result(
                        body, signatureHeader)
                .getResult();
        log.info("收到 VIP 微信支付回调通知，订单号：{}", notifyResult);
        String outTradeNo = notifyResult.getOutTradeNo();
        String transactionId = StringUtils.hasText(notifyResult.getTransactionId())
                ? notifyResult.getTransactionId()
                : outTradeNo;
        Long amountMinor = null;
        if (notifyResult.getAmount() != null && notifyResult.getAmount().getTotal() != null) {
            amountMinor = notifyResult.getAmount().getTotal().longValue();
        }
        if (amountMinor == null) {
            log.warn("WeChat VIP IPN missing amount orderId={}", outTradeNo);
            throw new BusinessException("微信支付金额缺失");
        }
        VipOrder vipOrder = vipOrderRepository.findById(outTradeNo, VipOrderRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
        if (!MoneyRounding.matchesGatewayMinor(amountMinor, vipOrder.baseOrder().payment().payAmount())) {
            log.warn("WeChat VIP IPN amount mismatch orderId={} amountMinor={}", outTradeNo, amountMinor);
            throw new BusinessException("微信支付金额不匹配");
        }
        if (!paymentNotifyLogService.tryBegin(outTradeNo, transactionId, "vip-wechat", body)) {
            log.info("重复 VIP 微信回调已忽略 orderId={}", outTradeNo);
            return WECHAT_NOTIFY_SUCCESS;
        }
        try {
            completeAfterPayment(outTradeNo, transactionId);
            paymentNotifyLogService.markProcessed(outTradeNo, "vip-wechat", body);
        } catch (Exception ex) {
            paymentNotifyLogService.markFailed(outTradeNo, "vip-wechat");
            log.error("VIP WeChat notify failed orderId={}", outTradeNo, ex);
            throw ex;
        }
        return WECHAT_NOTIFY_SUCCESS;
    }

    public String paymentNotifyVNPay(Map<String, String> params) {
        Optional<PaymentNotifyResult> parsed = vnpayPaymentGateway.parsePaymentNotify(null, params);
        if (parsed.isEmpty()) {
            return "RspCode=97&Message=Invalid signature";
        }
        PaymentNotifyResult result = parsed.get();
        VipOrder vipOrder = vipOrderRepository.findById(result.orderId(), VipOrderRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
        if (!vnpayPaymentGateway.matchesPayAmount(result.amountMinor(), vipOrder.baseOrder().payment().payAmount())) {
            log.warn("VNPay VIP IPN amount mismatch orderId={} amountMinor={}", result.orderId(), result.amountMinor());
            return "RspCode=04&Message=Invalid amount";
        }
        String body = params.toString();
        if (!paymentNotifyLogService.tryBegin(result.orderId(), result.transactionId(), "vip-vnpay", body)) {
            log.info("重复 VIP VNPay 回调已忽略 orderId={}", result.orderId());
            return VNPAY_NOTIFY_SUCCESS;
        }
        try {
            completeAfterPayment(result.orderId(), result.transactionId());
            paymentNotifyLogService.markProcessed(result.orderId(), "vip-vnpay", body);
        } catch (Exception ex) {
            paymentNotifyLogService.markFailed(result.orderId(), "vip-vnpay");
            log.error("VIP VNPay notify failed orderId={}", result.orderId(), ex);
            throw ex;
        }
        return VNPAY_NOTIFY_SUCCESS;
    }

    public String paymentNotifyMoMo(Map<String, String> params) {
        Optional<PaymentNotifyResult> parsed = momoPaymentGateway.parsePaymentNotify(null, params);
        if (parsed.isEmpty()) {
            return "{\"resultCode\":1,\"message\":\"invalid\"}";
        }
        PaymentNotifyResult result = parsed.get();
        if (result.amountMinor() == null) {
            log.warn("MoMo VIP IPN missing amount orderId={}", result.orderId());
            return "{\"resultCode\":1,\"message\":\"invalid amount\"}";
        }
        VipOrder vipOrder = vipOrderRepository.findById(result.orderId(), VipOrderRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
        if (!momoPaymentGateway.matchesPayAmount(result.amountMinor(), vipOrder.baseOrder().payment().payAmount())) {
            log.warn("MoMo VIP IPN amount mismatch orderId={} amountMinor={}", result.orderId(), result.amountMinor());
            return "{\"resultCode\":1,\"message\":\"invalid amount\"}";
        }
        String body = params.toString();
        if (!paymentNotifyLogService.tryBegin(result.orderId(), result.transactionId(), "vip-momo", body)) {
            log.info("重复 VIP MoMo 回调已忽略 orderId={}", result.orderId());
            return "{\"resultCode\":0,\"message\":\"success\"}";
        }
        try {
            completeAfterPayment(result.orderId(), result.transactionId());
            paymentNotifyLogService.markProcessed(result.orderId(), "vip-momo", body);
        } catch (Exception ex) {
            paymentNotifyLogService.markFailed(result.orderId(), "vip-momo");
            log.error("VIP MoMo notify failed orderId={}", result.orderId(), ex);
            throw ex;
        }
        return "{\"resultCode\":0,\"message\":\"success\"}";
    }

    /** Idempotent VIP payment completion for reconciliation jobs (missed IPN). */
    public void reconcilePayment(String orderId, String transactionId) {
        completeAfterPayment(orderId, transactionId == null ? orderId : transactionId);
    }

    private void completeAfterPayment(String outTradeNo, String tradeNo) {
        VipOrder vipOrder = vipOrderRepository.findById(outTradeNo, VipOrderRepository.COMPLEX_FETCHER_FOR_ADMIN)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单不存在"));
        if (!paymentRepository.claimPayTime(outTradeNo, tradeNo == null ? outTradeNo : tradeNo, LocalDateTime.now())) {
            log.info("重复支付回调，CAS 忽略，vipOrderId={}", vipOrder.id());
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
    }

    private String notifyPathForMarket() {
        String provider = marketProperties.getPaymentProvider() == null
                ? "wechat"
                : marketProperties.getPaymentProvider().trim().toLowerCase(Locale.ROOT);
        if ("vnpay".equals(provider) || "vn_pay".equals(provider)) {
            return "/front/vip-order/notify/pay/vnpay";
        }
        if ("momo".equals(provider) || "mo_mo".equals(provider)) {
            return "/front/vip-order/notify/pay/momo";
        }
        return "/front/vip-order/notify/pay/wechat";
    }
}
