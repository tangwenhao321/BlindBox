package io.github.qifan777.server.fragment.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.hutool.core.util.IdUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/fragment-exchange-sku")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box")
@Transactional
public class FragmentExchangeSkuForAdminController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbcTemplate.queryForList(
                """
                        SELECT id, name, cover, fragment_cost, stock_remaining, enabled, sort_order
                        FROM fragment_exchange_sku ORDER BY sort_order ASC
                        """
        );
    }

    @PostMapping("save")
    public String save(@RequestBody SkuSaveRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new BusinessException("名称不能为空");
        }
        if (request.fragmentCost() <= 0) {
            throw new BusinessException("碎片消耗必须大于 0");
        }
        if (request.id() == null || request.id().isBlank()) {
            String id = IdUtil.fastSimpleUUID();
            jdbcTemplate.update(
                    """
                            INSERT INTO fragment_exchange_sku (id, name, cover, fragment_cost, stock_remaining, enabled, sort_order)
                            VALUES (?,?,?,?,?,?,?)
                            """,
                    id,
                    request.name(),
                    request.cover(),
                    request.fragmentCost(),
                    request.stockRemaining(),
                    request.enabled() ? 1 : 0,
                    request.sortOrder()
            );
            return id;
        }
        jdbcTemplate.update(
                """
                        UPDATE fragment_exchange_sku
                        SET name = ?, cover = ?, fragment_cost = ?, stock_remaining = ?, enabled = ?, sort_order = ?
                        WHERE id = ?
                        """,
                request.name(),
                request.cover(),
                request.fragmentCost(),
                request.stockRemaining(),
                request.enabled() ? 1 : 0,
                request.sortOrder(),
                request.id()
        );
        return request.id();
    }

    @DeleteMapping("{id}")
    public void delete(@PathVariable String id) {
        jdbcTemplate.update("DELETE FROM fragment_exchange_sku WHERE id = ?", id);
    }

    public record SkuSaveRequest(
            String id,
            String name,
            String cover,
            int fragmentCost,
            int stockRemaining,
            boolean enabled,
            int sortOrder
    ) {
    }
}
