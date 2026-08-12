package io.github.qifan777.server.coupon.root.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.coupon.root.entity.Coupon;
import io.github.qifan777.server.coupon.root.entity.dto.CouponSpec;
import io.github.qifan777.server.coupon.root.repository.CouponRepository;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("front/coupon")
@AllArgsConstructor
@DefaultFetcherOwner(CouponRepository.class)
@Transactional
public class CouponForFrontController {
    private final CouponRepository couponRepository;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Coupon findById(@PathVariable String id) {
        return couponRepository.findById(id, CouponRepository.COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Coupon> query(@RequestBody QueryRequest<CouponSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return couponRepository.findPage(queryRequest, CouponRepository.COMPLEX_FETCHER_FOR_FRONT);
    }
}
