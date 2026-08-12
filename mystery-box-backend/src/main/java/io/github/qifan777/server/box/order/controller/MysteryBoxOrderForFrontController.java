package io.github.qifan777.server.box.order.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import com.github.binarywang.wxpay.bean.result.WxPayUnifiedOrderV3Result;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderInput;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderSpec;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.OrderIdLookupService;
import io.github.qifan777.server.box.order.model.OrderPaymentMetaView;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.box.order.service.OrderDrawIntegrityService;
import io.github.qifan777.server.box.order.service.OrderPaymentMetaService;
import io.github.qifan777.server.box.order.service.PaymentRetentionService;
import io.github.qifan777.server.box.order.service.PurchaseLimitService;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.box.root.entity.dto.MysteryBoxInput;
import io.github.qifan777.server.infrastructure.aop.NotRepeat;
import io.github.qifan777.server.infrastructure.compliance.IosDigitalGoodsGuard;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.security.FrontOwnership;
import io.github.qifan777.server.infrastructure.util.ClientIpResolver;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.payment.gateway.MoMoPrepayView;
import io.github.qifan777.server.payment.gateway.VNPayPrepayView;
import io.github.qifan777.server.risk.service.RiskControlService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.babyfish.jimmer.client.ApiIgnore;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("front/mystery-box-order")
@RequiredArgsConstructor
@DefaultFetcherOwner(MysteryBoxOrderRepository.class)
@Transactional
public class MysteryBoxOrderForFrontController {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderService mysteryBoxOrderService;
    private final RiskControlService riskControlService;
    private final OrderLogisticsService orderLogisticsService;
    private final OrderPaymentMetaService orderPaymentMetaService;
    private final PaymentRetentionService paymentRetentionService;
    private final PurchaseLimitService purchaseLimitService;
    private final OrderDrawIntegrityService orderDrawIntegrityService;
    private final OrderIdLookupService orderIdLookupService;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final ClientIpResolver clientIpResolver;
    private final IosDigitalGoodsGuard iosDigitalGoodsGuard;

    @Value("${payment.mock-enabled:false}")
    private boolean mockPaymentEnabled;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") MysteryBoxOrder findById(@PathVariable String id) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findById(resolveOrderId(id), MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        FrontOwnership.assertSelf(order.creator().id());
        return order;
    }

    @GetMapping("{id}/payment-meta")
    public OrderPaymentMetaView paymentMeta(@PathVariable String id) {
        return orderPaymentMetaService.meta(resolveOrderId(id));
    }

    @PostMapping("{id}/abandon-offer")
    public PaymentRetentionService.AbandonOfferView abandonOffer(@PathVariable String id) {
        return paymentRetentionService.claimAbandonOffer(resolveOrderId(id));
    }

    @GetMapping("{id}/draw-integrity")
    public OrderDrawIntegrityService.OrderDrawIntegrityView drawIntegrity(@PathVariable String id) {
        return orderDrawIntegrityService.checkForCurrentUser(resolveOrderId(id));
    }

    @GetMapping("{id}/logistics")
    public List<OrderLogisticsService.LogisticsEventView> logistics(@PathVariable String id) {
        String orderId = resolveOrderId(id);
        MysteryBoxOrder order = mysteryBoxOrderRepository.findById(orderId, MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_FRONT)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        if (!order.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException("无权查看物流");
        }
        return orderLogisticsService.list(orderId);
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") MysteryBoxOrder> query(@RequestBody QueryRequest<MysteryBoxOrderSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return mysteryBoxOrderRepository.findPage(queryRequest, MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @PostMapping("create")
    @NotRepeat
    public String create(@RequestBody @Validated MysteryBoxOrderInput mysteryBoxOrderInput,
                         HttpServletRequest request,
                         @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                         @RequestHeader(value = "x-device-id", required = false) String deviceId,
                         @RequestHeader(value = "x-draw-mode", defaultValue = "instant") String drawMode,
                         @RequestHeader(value = "x-slot-no", required = false) Integer slotNo,
                         @RequestHeader(value = "x-recommend-variant", required = false) String recommendVariantHeader,
                         @RequestParam(value = "recommendVariant", required = false) String recommendVariantParam) {
        riskCheck(request, riskConfirm, deviceId);
        String recommendVariant = firstNonBlank(recommendVariantHeader, recommendVariantParam);
        return mysteryBoxOrderService.create(mysteryBoxOrderInput, drawMode, slotNo, recommendVariant);
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }

    @PostMapping("{id}/prepay/wechat")
    @NotRepeat
    public WxPayUnifiedOrderV3Result.JsapiResult prepayWechat(@PathVariable String id,
                                                              HttpServletRequest request,
                                                              @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                                                              @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        paymentGatewayRegistry.assertMarketProvider("wechat");
        riskCheck(request, riskConfirm, deviceId);
        return mysteryBoxOrderService.prepay(resolveOrderId(id));
    }

    @PostMapping("{id}/pay/mock")
    @NotRepeat
    public String mockPay(@PathVariable String id,
                          HttpServletRequest request,
                          @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                          @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        if (!mockPaymentEnabled) {
            throw new BusinessException("模拟支付未开启");
        }
        riskCheck(request, riskConfirm, deviceId);
        return mysteryBoxOrderService.mockPay(resolveOrderId(id));
    }

    @PostMapping("{id}/prepay/wechat/retry")
    @NotRepeat
    public WxPayUnifiedOrderV3Result.JsapiResult retryPrepayWechat(@PathVariable String id,
                                                                   HttpServletRequest request,
                                                                   @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                                                                   @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        paymentGatewayRegistry.assertMarketProvider("wechat");
        riskCheck(request, riskConfirm, deviceId);
        return mysteryBoxOrderService.prepay(resolveOrderId(id));
    }

    @PostMapping("{id}/prepay/vnpay")
    @NotRepeat
    public VNPayPrepayView prepayVNPay(@PathVariable String id,
                                       HttpServletRequest request,
                                       @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                                       @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        paymentGatewayRegistry.assertMarketProvider("vnpay");
        riskCheck(request, riskConfirm, deviceId);
        return mysteryBoxOrderService.prepayVNPay(resolveOrderId(id), clientIpResolver.resolve(request));
    }

    @PostMapping("{id}/prepay/vnpay/retry")
    @NotRepeat
    public VNPayPrepayView retryPrepayVNPay(@PathVariable String id,
                                            HttpServletRequest request,
                                            @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                                            @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        paymentGatewayRegistry.assertMarketProvider("vnpay");
        riskCheck(request, riskConfirm, deviceId);
        return mysteryBoxOrderService.prepayVNPay(resolveOrderId(id), clientIpResolver.resolve(request));
    }

    @PostMapping("{id}/prepay/momo")
    @NotRepeat
    public MoMoPrepayView prepayMoMo(@PathVariable String id,
                                     HttpServletRequest request,
                                     @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                                     @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        paymentGatewayRegistry.assertMarketOrSecondaryWallet("momo");
        riskCheck(request, riskConfirm, deviceId);
        return mysteryBoxOrderService.prepayMoMo(resolveOrderId(id), clientIpResolver.resolve(request));
    }

    @PostMapping("{id}/prepay/momo/retry")
    @NotRepeat
    public MoMoPrepayView retryPrepayMoMo(@PathVariable String id,
                                          HttpServletRequest request,
                                          @RequestHeader(value = "x-risk-confirm", required = false) String riskConfirm,
                                          @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        paymentGatewayRegistry.assertMarketOrSecondaryWallet("momo");
        riskCheck(request, riskConfirm, deviceId);
        return mysteryBoxOrderService.prepayMoMo(resolveOrderId(id), clientIpResolver.resolve(request));
    }

    @GetMapping("notify/pay/vnpay")
    @ApiIgnore
    public String paymentNotifyVNPayGet(@RequestParam Map<String, String> params) {
        return mysteryBoxOrderService.paymentNotifyVNPay(new HashMap<>(params));
    }

    @PostMapping("notify/pay/vnpay")
    @ApiIgnore
    public String paymentNotifyVNPayPost(@RequestParam Map<String, String> params) {
        return mysteryBoxOrderService.paymentNotifyVNPay(new HashMap<>(params));
    }

    @GetMapping("notify/pay/momo")
    @ApiIgnore
    public String paymentNotifyMoMoGet(@RequestParam Map<String, String> params) {
        return mysteryBoxOrderService.paymentNotifyMoMo(new HashMap<>(params));
    }

    @PostMapping("notify/pay/momo")
    @ApiIgnore
    public String paymentNotifyMoMoPost(@RequestParam Map<String, String> params) {
        return mysteryBoxOrderService.paymentNotifyMoMo(new HashMap<>(params));
    }

    @PostMapping("notify/pay/wechat")
    @ApiIgnore
    public String paymentNotifyWechat(@RequestBody String body,
                                      @RequestHeader(value = "Wechatpay-Timestamp") String timestamp,
                                      @RequestHeader(value = "Wechatpay-Nonce") String nonce,
                                      @RequestHeader(value = "Wechatpay-Signature") String signature,
                                      @RequestHeader(value = "Wechatpay-Serial") String serial) {
        SignatureHeader signatureHeader = SignatureHeader.builder().signature(signature)
                .serial(serial)
                .nonce(nonce)
                .timeStamp(timestamp).build();
        return mysteryBoxOrderService.paymentNotifyWechat(body, signatureHeader);
    }

    @PostMapping("{id}/unpaid/cancel/user")
    @NotRepeat
    public String unpaidCancelForUser(@PathVariable String id) {
        return mysteryBoxOrderService.unpaidCancelForUser(resolveOrderId(id));
    }

    @PostMapping("{id}/redeem/balance")
    @NotRepeat
    public BigDecimal redeemToBalance(@PathVariable String id) {
        iosDigitalGoodsGuard.rejectIfIosAppStoreClient();
        return mysteryBoxOrderService.redeemToBalance(resolveOrderId(id));
    }

    @PostMapping("{id}/confirm-receive/user")
    @NotRepeat
    public String confirmReceiveForUser(@PathVariable String id) {
        return mysteryBoxOrderService.confirmReceiveForUser(resolveOrderId(id));
    }


    @PostMapping("notify/refund/wechat")
    @ApiIgnore
    public String refundNotifyWeChat(@RequestBody String body,
                                     @RequestHeader(value = "Wechatpay-Timestamp") String timestamp,
                                     @RequestHeader(value = "Wechatpay-Nonce") String nonce,
                                     @RequestHeader(value = "Wechatpay-Signature") String signature,
                                     @RequestHeader(value = "Wechatpay-Serial") String serial) {
        SignatureHeader signatureHeader = SignatureHeader.builder().signature(signature)
                .serial(serial)
                .nonce(nonce)
                .timeStamp(timestamp).build();
        return mysteryBoxOrderService.refundNotifyWeChat(body, signatureHeader);
    }

    @PostMapping("calculate")
    public io.github.qifan777.server.payment.entity.dto.PaymentCalculateView calculate(
            @Validated @RequestBody MysteryBoxOrderInput productOrderInput,
            @RequestParam(defaultValue = "true") boolean autoCoupon,
            @RequestParam(required = false) String retentionOrderId
    ) {
        return mysteryBoxOrderService.calculate(
                productOrderInput,
                autoCoupon,
                retentionOrderId == null ? null : resolveOrderId(retentionOrderId)
        );
    }

    @GetMapping("purchase-limit/{boxId}")
    public PurchaseLimitService.PurchaseLimitView purchaseLimit(@PathVariable String boxId) {
        return purchaseLimitService.status(StpUtil.getLoginIdAsString(), boxId);
    }

    private void riskCheck(HttpServletRequest request, String riskConfirm, String deviceId) {
        String userId = StpUtil.getLoginIdAsString();
        riskControlService.touchDeviceLink(userId, deviceId);
        RiskControlService.RiskDecision decision = riskControlService.evaluateOrderAction(
                userId, deviceId, clientIpResolver.resolve(request));
        if (decision.blocked()) {
            throw new BusinessException("操作过于频繁，请稍后再试");
        }
        if (decision.requireConfirm() && !"CONFIRM".equalsIgnoreCase(riskConfirm)) {
            throw new BusinessException("检测到高风险请求，请携带 x-risk-confirm=CONFIRM 后重试");
        }
    }

    private String resolveOrderId(String id) {
        return orderIdLookupService.resolveCurrentId(id);
    }
}
