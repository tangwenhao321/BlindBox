package io.github.qifan777.server.box.root.controller;

import io.github.qifan777.server.dict.model.QualityType;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.github.qifan777.server.Immutables;
import io.github.qifan777.server.box.draw.BoxProfitabilityService;
import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.entity.MysteryBoxTable;
import io.github.qifan777.server.box.root.entity.dto.MysteryBoxInput;
import io.github.qifan777.server.box.root.entity.dto.MysteryBoxSpec;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.github.qifan777.server.box.root.service.MysteryBoxProbabilityHistoryService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.QueryRequest;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.data.domain.Page;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("admin/mystery-box")
@AllArgsConstructor
@DefaultFetcherOwner(MysteryBoxRepository.class)
@SaCheckPermission("/mystery-box")
@Transactional
public class MysteryBoxForAdminController {
    private final MysteryBoxRepository mysteryBoxRepository;
    private final MysteryBoxProbabilityHistoryService mysteryBoxProbabilityHistoryService;
    private final ProductRepository productRepository;
    private final BoxProfitabilityService boxProfitabilityService;

    @GetMapping("{id}")
    public @FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") MysteryBox findById(@PathVariable String id) {

        return mysteryBoxRepository.findById(id, MysteryBoxRepository.COMPLEX_FETCHER_FOR_ADMIN).orElseThrow(() -> new BusinessException("数据不存在"));
    }

    @PostMapping("query")
    public Page<@FetchBy(value = "COMPLEX_FETCHER_FOR_ADMIN") MysteryBox> query(@RequestBody QueryRequest<MysteryBoxSpec> queryRequest) {
        return mysteryBoxRepository.findPage(queryRequest, MysteryBoxRepository.COMPLEX_FETCHER_FOR_ADMIN);
    }

    @PostMapping("save")
    public String save(@RequestBody @Validated MysteryBoxInput mysteryBoxInput) {
        MysteryBox entity = mysteryBoxInput.toEntity();
        String[] productIdArr = mysteryBoxInput.getProductIds();
        if (productIdArr == null || productIdArr.length == 0) {
            throw new BusinessException("请至少选择一件奖品");
        }
        List<String> productIds = java.util.Arrays.stream(productIdArr).distinct().toList();
        List<Product> products = productRepository.findByIds(productIds);
        if (products.size() != productIds.size()) {
            throw new BusinessException("存在无效奖品 ID");
        }
        MysteryBox mysteryBox = Immutables.createMysteryBox(entity, draft -> {
            draft.setBoxRelList(new ArrayList<>());
            for (Product product : products) {
                int stock = defaultStockForTier(product.qualityType());
                draft.addIntoBoxRelList(relDraft -> relDraft.setMysteryBox(entity)
                        .setProductId(product.id())
                        .setStockTotal(stock)
                        .setStockRemaining(stock)
                        .setSortOrder(0)
                        .setLastOne(false));
            }
        });
        String savedId = mysteryBoxRepository.save(mysteryBox).id();
        // Full EV gate: packs + worst-case dynamic odds + pity amortization (rolls back save on fail).
        boxProfitabilityService.assertBoxProfitable(savedId);
        mysteryBoxProbabilityHistoryService.recordIfChanged(
                savedId,
                entity.legendaryRate(),
                entity.hiddenRate(),
                entity.generalRate()
        );
        return savedId;
    }

    private static int defaultStockForTier(QualityType tier) {
        if (tier == QualityType.LEGENDARY) {
            return 5;
        }
        if (tier == QualityType.HIDDEN) {
            return 20;
        }
        return 100;
    }

    @GetMapping("{id}/probability/history")
    public List<MysteryBoxProbabilityHistoryService.ProbabilityHistoryView> probabilityHistory(
            @PathVariable String id,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return mysteryBoxProbabilityHistoryService.list(id, limit);
    }

    /**
     * Ops-facing pity wall for a box. Kept as a dedicated write so admin can tune threshold
     * even when generated MysteryBoxInput clients lag behind the entity field.
     */
    @PutMapping("{id}/pity-threshold")
    public Boolean updatePityThreshold(
            @PathVariable String id,
            @RequestBody @Validated PityThresholdBody body
    ) {
        mysteryBoxRepository.findById(id)
                .orElseThrow(() -> new BusinessException("数据不存在"));
        MysteryBoxTable t = MysteryBoxTable.$;
        int updated = mysteryBoxRepository.sql().createUpdate(t)
                .where(t.id().eq(id))
                .set(t.pityThreshold(), body.pityThreshold())
                .execute();
        if (updated <= 0) {
            throw new BusinessException("保底阈值更新失败");
        }
        boxProfitabilityService.assertBoxProfitable(id);
        return true;
    }

    @DeleteMapping
    public Boolean delete(@RequestBody List<String> ids) {
        mysteryBoxRepository.deleteAllById(ids);
        return true;
    }

    public record PityThresholdBody(
            @Min(1) @Max(9999) int pityThreshold
    ) {
    }

}
