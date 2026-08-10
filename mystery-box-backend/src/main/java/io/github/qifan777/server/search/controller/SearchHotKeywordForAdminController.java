package io.github.qifan777.server.search.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import cn.hutool.core.util.IdUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/search/hot-keywords")
@RequiredArgsConstructor
@SaCheckRole("管理员")
@Transactional
public class SearchHotKeywordForAdminController {
    private static final String ORDER_BY = "ORDER BY sort_order ASC, created_time ASC, id ASC";

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbcTemplate.queryForList(
                "SELECT id, keyword, sort_order, enabled, created_time FROM search_hot_keyword " + ORDER_BY
        );
    }

    @PostMapping("save")
    public String save(@RequestBody SaveRequest request) {
        if (request.keyword() == null || request.keyword().isBlank()) {
            throw new BusinessException("关键词不能为空");
        }
        String keyword = request.keyword().trim();
        if (request.id() == null || request.id().isBlank()) {
            String id = IdUtil.fastSimpleUUID();
            jdbcTemplate.update(
                    """
                            INSERT INTO search_hot_keyword (id, keyword, sort_order, enabled, created_time)
                            VALUES (?,?,?,?,?)
                            """,
                    id,
                    keyword,
                    nextSortOrder(),
                    request.enabled() ? 1 : 0,
                    LocalDateTime.now()
            );
            return id;
        }
        jdbcTemplate.update(
                "UPDATE search_hot_keyword SET keyword = ?, enabled = ? WHERE id = ?",
                keyword,
                request.enabled() ? 1 : 0,
                request.id()
        );
        return request.id();
    }

    @PostMapping("{id}/enabled")
    public void setEnabled(@PathVariable String id, @RequestParam boolean enabled) {
        int updated = jdbcTemplate.update(
                "UPDATE search_hot_keyword SET enabled = ? WHERE id = ?",
                enabled ? 1 : 0,
                id
        );
        if (updated == 0) {
            throw new BusinessException("记录不存在");
        }
    }

    @PostMapping("reorder")
    public void reorder(@RequestBody ReorderRequest request) {
        if (request.ids() == null || request.ids().isEmpty()) {
            throw new BusinessException("排序列表不能为空");
        }
        List<String> current = orderedIds();
        if (request.ids().size() != current.size() || !current.containsAll(request.ids())) {
            throw new BusinessException("排序列表与当前数据不一致");
        }
        int order = 1;
        for (String id : request.ids()) {
            jdbcTemplate.update("UPDATE search_hot_keyword SET sort_order = ? WHERE id = ?", order++, id);
        }
    }

    @DeleteMapping("{id}")
    public void delete(@PathVariable String id) {
        jdbcTemplate.update("DELETE FROM search_hot_keyword WHERE id = ?", id);
        renumber();
    }

    private void renumber() {
        int order = 1;
        for (String id : orderedIds()) {
            jdbcTemplate.update("UPDATE search_hot_keyword SET sort_order = ? WHERE id = ?", order++, id);
        }
    }

    private List<String> orderedIds() {
        return new ArrayList<>(jdbcTemplate.queryForList(
                "SELECT id FROM search_hot_keyword " + ORDER_BY,
                String.class
        ));
    }

    private int nextSortOrder() {
        Integer max = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(sort_order), 0) FROM search_hot_keyword",
                Integer.class
        );
        return (max == null ? 0 : max) + 1;
    }

    public record SaveRequest(String id, String keyword, boolean enabled) {
    }

    public record ReorderRequest(List<String> ids) {
    }
}
