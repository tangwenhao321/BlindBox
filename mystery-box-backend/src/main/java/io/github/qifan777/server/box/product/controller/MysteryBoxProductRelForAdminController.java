package io.github.qifan777.server.box.product.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.box.draw.BoxProfitabilityService;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRel;
import io.github.qifan777.server.box.product.entity.dto.MysteryBoxProductRelInput;
import io.github.qifan777.server.box.product.entity.dto.MysteryBoxProductRelSpec;
import io.github.qifan777.server.box.product.repository.MysteryBoxProductRelRepository;
import io.github.qifan777.server.box.product.service.PrizeStockAuditService;
import io.github.qifan777.server.box.product.service.PrizeStockService;
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
@RequestMapping("admin/mystery-box-product-rel")
@AllArgsConstructor
@DefaultFetcherOwner(MysteryBoxProductRelRepository.class)
@SaCheckPermission("/mystery-box-product-rel")
@Transactional
public class MysteryBoxProductRelForAdminController {
    private final MysteryBoxProductRelRepository mysteryBoxProductRelRepository;
    private final PrizeStockAuditService prizeStockAuditService;
    private final PrizeStockService prizeStockService;
    private final BoxProfitabilityService boxProfitabilityService;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") MysteryBoxProductRel findById(@PathVariable String id) {
        return mysteryBoxProductRelRepository.findById(id, MysteryBoxProductRelRepository.COMPLEX_FETCHER_FOR_ADMIN).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") MysteryBoxProductRel> query(@RequestBody QueryRequest<MysteryBoxProductRelSpec> queryRequest) {
        return mysteryBoxProductRelRepository.findPage(queryRequest, MysteryBoxProductRelRepository.COMPLEX_FETCHER_FOR_ADMIN);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated MysteryBoxProductRelInput mysteryBoxProductRelInput) {
        Integer beforeTotal = null;
        Integer beforeRemaining = null;
        if (mysteryBoxProductRelInput.getId() != null && !mysteryBoxProductRelInput.getId().isBlank()) {
            var existing = mysteryBoxProductRelRepository.findById(mysteryBoxProductRelInput.getId());
            if (existing.isPresent()) {
                beforeTotal = existing.get().stockTotal();
                beforeRemaining = existing.get().stockRemaining();
            }
        }
        MysteryBoxProductRel saved = mysteryBoxProductRelRepository.save(mysteryBoxProductRelInput.toEntity());
        prizeStockAuditService.logChange(
                saved.id(),
                saved.mysteryBoxId(),
                saved.productId(),
                beforeTotal,
                beforeRemaining,
                saved.stockTotal(),
                saved.stockRemaining(),
                saved.lastOne()
        );
        int beforeRem = beforeRemaining == null ? 0 : beforeRemaining;
        prizeStockService.notifyStockIncreased(
                saved.mysteryBoxId(),
                saved.productId(),
                beforeRem,
                saved.stockRemaining()
        );
        boxProfitabilityService.recheckBoxForRel(saved);
        return saved.id();
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return true;
        }
        var existing = mysteryBoxProductRelRepository.findByIds(ids, MysteryBoxProductRelRepository.COMPLEX_FETCHER_FOR_ADMIN);
        java.util.LinkedHashSet<String> boxIds = new java.util.LinkedHashSet<>();
        for (MysteryBoxProductRel rel : existing) {
            if (rel.mysteryBoxId() != null && !rel.mysteryBoxId().isBlank()) {
                boxIds.add(rel.mysteryBoxId());
            }
        }
        mysteryBoxProductRelRepository.deleteAllById(ids);
        for (String boxId : boxIds) {
            boxProfitabilityService.assertBoxProfitable(boxId);
        }
        return true;
    }
}
