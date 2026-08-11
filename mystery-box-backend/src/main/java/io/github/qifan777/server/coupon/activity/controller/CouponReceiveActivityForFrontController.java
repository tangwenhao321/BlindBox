package io.github.qifan777.server.coupon.activity.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.coupon.activity.entity.CouponReceiveActivity;
import io.github.qifan777.server.coupon.activity.entity.dto.CouponReceiveActivityInput;
import io.github.qifan777.server.coupon.activity.entity.dto.CouponReceiveActivitySpec;
import io.github.qifan777.server.coupon.activity.repository.CouponReceiveActivityRepository;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/coupon-receive-activity")
@AllArgsConstructor
@DefaultFetcherOwner(CouponReceiveActivityRepository.class)
@Transactional
public class CouponReceiveActivityForFrontController {
    private final CouponReceiveActivityRepository couponReceiveActivityRepository;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") CouponReceiveActivity findById(@PathVariable String id) {
        return couponReceiveActivityRepository.findById(id, CouponReceiveActivityRepository.COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") CouponReceiveActivity> query(@RequestBody QueryRequest<CouponReceiveActivitySpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return couponReceiveActivityRepository.findPage(queryRequest, CouponReceiveActivityRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated CouponReceiveActivityInput couponReceiveActivityInput) {
        throw new BusinessException("COUPON_RECEIVE_DISABLED: 领取活动暂未开放");
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        throw new BusinessException("COUPON_RECEIVE_DISABLED: 领取活动暂未开放");
    }
}
