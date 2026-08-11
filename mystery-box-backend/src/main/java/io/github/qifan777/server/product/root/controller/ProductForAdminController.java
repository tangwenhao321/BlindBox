package io.github.qifan777.server.product.root.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.box.draw.BoxProfitabilityService;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.dto.ProductInput;
import io.github.qifan777.server.product.root.entity.dto.ProductSpec;
import io.github.qifan777.server.product.root.repository.ProductRepository;
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
@RequestMapping("admin/product")
@AllArgsConstructor
@DefaultFetcherOwner(ProductRepository.class)
@SaCheckPermission("/product")
@Transactional
public class ProductForAdminController {
    private final ProductRepository productRepository;
    private final BoxProfitabilityService boxProfitabilityService;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") Product findById(@PathVariable String id) {
        return productRepository.findById(id, ProductRepository.COMPLEX_FETCHER_FOR_ADMIN).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") Product> query(@RequestBody QueryRequest<ProductSpec> queryRequest) {
        return productRepository.findPage(queryRequest, ProductRepository.COMPLEX_FETCHER_FOR_ADMIN);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated ProductInput productInput) {
        String id = productRepository.save(productInput.toEntity()).id();
        boxProfitabilityService.recheckBoxesForProduct(id);
        return id;
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        productRepository.deleteAllById(ids);
        return true;
    }
}
