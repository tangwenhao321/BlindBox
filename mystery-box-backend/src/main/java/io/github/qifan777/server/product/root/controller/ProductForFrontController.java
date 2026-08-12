package io.github.qifan777.server.product.root.controller;

import cn.dev33.satoken.stp.StpUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.dto.ProductSpec;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("front/product")
@AllArgsConstructor
@DefaultFetcherOwner(ProductRepository.class)
@Transactional
public class ProductForFrontController {
    private final ProductRepository productRepository;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Product findById(@PathVariable String id) {
        return productRepository.findById(id, ProductRepository.COMPLEX_FETCHER_FOR_FRONT).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_FRONT") Product> query(@RequestBody QueryRequest<ProductSpec> queryRequest) {
        queryRequest.getQuery().setCreatorId(StpUtil.getLoginIdAsString());
        return productRepository.findPage(queryRequest, ProductRepository.COMPLEX_FETCHER_FOR_FRONT);
    }

    @PostMapping("save")
    public String save() {
        throw new BusinessException("PRODUCT_WRITE_FORBIDDEN: 前台禁止创建或修改商品");
    }

    @DeleteMapping
    public Boolean delete() {
        throw new BusinessException("PRODUCT_WRITE_FORBIDDEN: 前台禁止删除商品");
    }
}
