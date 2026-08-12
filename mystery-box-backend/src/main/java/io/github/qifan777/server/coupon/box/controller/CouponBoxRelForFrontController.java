package io.github.qifan777.server.coupon.box.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.coupon.box.entity.CouponBoxRel;
import io.github.qifan777.server.coupon.box.entity.dto.CouponBoxRelInput;
import io.github.qifan777.server.coupon.box.entity.dto.CouponBoxRelSpec;
import io.github.qifan777.server.coupon.box.repository.CouponBoxRelRepository;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/coupon-box-rel")
@AllArgsConstructor
@DefaultFetcherOwner(CouponBoxRelRepository.class)
@Transactional
public class CouponBoxRelForFrontController {
    private final CouponBoxRelRepository couponBoxRelRepository;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") CouponBoxRel findById(@PathVariable String id) {
        return couponBoxRelRepository.findById(id, CouponBoxRelRepository.COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") CouponBoxRel> query(@RequestBody QueryRequest<CouponBoxRelSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return couponBoxRelRepository.findPage(queryRequest, CouponBoxRelRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated CouponBoxRelInput couponBoxRelInput) {
        throw new BusinessException("COUPON_BOX_REL_WRITE_FORBIDDEN: 前台禁止修改优惠券与盲盒关联");
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        throw new BusinessException("COUPON_BOX_REL_WRITE_FORBIDDEN: 前台禁止删除优惠券与盲盒关联");
    }
}
