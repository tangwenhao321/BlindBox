package io.github.qifan777.server.vip.order.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.util.ClientIpResolver;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.vip.order.entity.VipOrder;
import io.github.qifan777.server.vip.order.entity.dto.VipOrderInput;
import io.github.qifan777.server.vip.order.entity.dto.VipOrderSpec;
import io.github.qifan777.server.vip.order.repository.VipOrderRepository;
import io.github.qifan777.server.vip.order.service.VipOrderService;
import io.qifan.infrastructure.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.ApiIgnore;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("front/vip-order")
@AllArgsConstructor
@DefaultFetcherOwner(VipOrderRepository.class)
@Transactional
public class VipOrderForFrontController {
    private final VipOrderRepository vipOrderRepository;
    private final VipOrderService vipOrderService;
    private final PaymentGatewayRegistry paymentGatewayRegistry;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") VipOrder findById(@PathVariable String id) {
        return vipOrderRepository.findById(id, VipOrderRepository.COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") VipOrder> query(@RequestBody QueryRequest<VipOrderSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return vipOrderRepository.findPage(queryRequest, VipOrderRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @PostMapping("save")
    public Object save(@RequestBody @Validated VipOrderInput vipOrderInput) {
        return vipOrderService.save(vipOrderInput);
    }

    @PostMapping("{id}/prepay/wechat")
    public Object prepayWechat(@PathVariable String id) {
        paymentGatewayRegistry.assertMarketProvider("wechat");
        return vipOrderService.prepay(id, "127.0.0.1");
    }

    @PostMapping("{id}/prepay/vnpay")
    public Object prepayVNPay(@PathVariable String id, HttpServletRequest request) {
        paymentGatewayRegistry.assertMarketProvider("vnpay");
        return vipOrderService.prepay(id, ClientIpResolver.resolve(request));
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        vipOrderRepository.findByIds(ids, VipOrderRepository.COMPLEX_FETCHER_FOR_FRONT).forEach(vipOrder -> {
            if (!vipOrder.creator().id().equals(StpUtil.getLoginIdAsString())) {
                throw new BusinessException("只能删除自己的数据");
            }
        });
        vipOrderRepository.deleteAllById(ids);
        return true;
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
        return vipOrderService.paymentNotifyWechat(body, signatureHeader);
    }

    @GetMapping("notify/pay/vnpay")
    @ApiIgnore
    public String paymentNotifyVNPayGet(@RequestParam Map<String, String> params) {
        return vipOrderService.paymentNotifyVNPay(new HashMap<>(params));
    }

    @PostMapping("notify/pay/vnpay")
    @ApiIgnore
    public String paymentNotifyVNPayPost(@RequestParam Map<String, String> params) {
        return vipOrderService.paymentNotifyVNPay(new HashMap<>(params));
    }
}
