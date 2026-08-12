package io.github.qifan777.server.box.order.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.address.entity.dto.AddressView;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItemFetcher;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderInput;
import io.github.qifan777.server.box.order.entity.dto.MysteryBoxOrderSpec;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.box.root.entity.dto.MystryBoxView;
import io.github.qifan777.server.logistics.service.OrderLogisticsService;
import io.github.qifan777.server.infrastructure.aop.NotRepeat;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.infrastructure.security.AdminActionOtpVerifier;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("admin/mystery-box-order")
@AllArgsConstructor
@DefaultFetcherOwner(MysteryBoxOrderRepository.class)
@SaCheckPermission("/mystery-box-order")
@Transactional
@Slf4j
public class MysteryBoxOrderForAdminController {
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderService mysteryBoxOrderService;
    private final OrderLogisticsService orderLogisticsService;
    private final AdminActionOtpVerifier adminActionOtpVerifier;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") MysteryBoxOrder findById(@PathVariable String id) {
        return mysteryBoxOrderRepository.findById(id, MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_ADMIN).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") MysteryBoxOrder> query(@RequestBody QueryRequest<MysteryBoxOrderSpec> queryRequest) {
        return mysteryBoxOrderRepository.findPage(queryRequest, MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_ADMIN);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated MysteryBoxOrderInput mysteryBoxOrderInput,
                       @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        return mysteryBoxOrderRepository.save(mysteryBoxOrderInput.toEntity()).id();
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids,
                          @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        mysteryBoxOrderRepository.deleteAllById(ids);
        return true;
    }

    @PostMapping("{id}/paid/cancel")
    @NotRepeat
    public String paidCancelForAdmin(@PathVariable String id,
                                     @RequestHeader(value = "x-admin-action-otp", required = false) String otp) {
        adminActionOtpVerifier.assertValid(otp);
        return mysteryBoxOrderService.paidCancelForAdmin(id);
    }

    @PostMapping("{id}/deliver")
    @NotRepeat
    public String deliver(@PathVariable String id, @RequestParam String trackingNumber,
                          @RequestParam(required = false) String carrierCode) {
        return mysteryBoxOrderService.deliver(id, trackingNumber, carrierCode);
    }

    @PostMapping("deliver/batch")
    public java.util.Map<String, Integer> batchDeliver(@RequestBody List<OrderLogisticsService.BatchShipLine> lines) {
        return java.util.Map.of("count", mysteryBoxOrderService.batchDeliver(lines));
    }
}