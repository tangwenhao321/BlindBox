package io.github.qifan777.server.coupon.category.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.coupon.category.entity.CouponCategoryRel;
import io.github.qifan777.server.coupon.category.entity.dto.CouponCategoryRelInput;
import io.github.qifan777.server.coupon.category.entity.dto.CouponCategoryRelSpec;
import io.github.qifan777.server.coupon.category.repository.CouponCategoryRelRepository;
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
@RequestMapping("front/coupon-category-rel")
@AllArgsConstructor
@DefaultFetcherOwner(CouponCategoryRelRepository.class)
@Transactional
public class CouponCategoryRelForFrontController {
    private final CouponCategoryRelRepository couponCategoryRelRepository;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") CouponCategoryRel findById(@PathVariable String id) {
        return couponCategoryRelRepository.findById(id, CouponCategoryRelRepository.COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") CouponCategoryRel> query(@RequestBody QueryRequest<CouponCategoryRelSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return couponCategoryRelRepository.findPage(queryRequest, CouponCategoryRelRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated CouponCategoryRelInput couponCategoryRelInput) {
        throw new BusinessException("COUPON_CATEGORY_REL_WRITE_FORBIDDEN: 前台禁止修改优惠券与分类关联");
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        throw new BusinessException("COUPON_CATEGORY_REL_WRITE_FORBIDDEN: 前台禁止删除优惠券与分类关联");
    }
}
