package io.github.qifan777.server.home.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.home.service.HomeSummaryService;
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
@RequestMapping("admin/ops-home-hot-box")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box")
@Transactional
public class OpsHomeHotBoxForAdminController {
    private static final String ORDER_BY_CLAUSE = "ORDER BY sort_order ASC, created_time ASC, id ASC";
    /** 与 App 首页轮播展示上限一致 */
    public static final int MAX_HOT_BOX_COUNT = 6;

    private final JdbcTemplate jdbcTemplate;
    private final HomeSummaryService homeSummaryService;

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbcTemplate.queryForList(
                """
                        SELECT h.id, h.mystery_box_id, h.sort_order, h.enabled, h.created_time,
                               b.name AS box_name, b.cover AS box_cover
                        FROM ops_home_hot_box h
                        LEFT JOIN mystery_box b ON b.id = h.mystery_box_id
                        """
                        + ORDER_BY_CLAUSE
        );
    }

    @PostMapping("save")
    public String save(@RequestBody HotBoxSaveRequest request) {
        if (request.mysteryBoxId() == null || request.mysteryBoxId().isBlank()) {
            throw new BusinessException("请选择盲盒");
        }
        if (request.id() == null || request.id().isBlank()) {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM ops_home_hot_box",
                    Integer.class
            );
            if (count != null && count >= MAX_HOT_BOX_COUNT) {
                throw new BusinessException("首页热盒最多配置 " + MAX_HOT_BOX_COUNT + " 个");
            }
            String id = IdUtil.fastSimpleUUID();
            jdbcTemplate.update(
                    """
                            INSERT INTO ops_home_hot_box (id, mystery_box_id, sort_order, enabled, created_time)
                            VALUES (?,?,?,?,?)
                            """,
                    id,
                    request.mysteryBoxId(),
                    nextSortOrder(),
                    request.enabled() ? 1 : 0,
                    LocalDateTime.now()
            );
            updateBoxCoverIfPresent(request.mysteryBoxId(), request.cover());
            renumberSortOrders();
            evictHomeCache();
            return id;
        }
        jdbcTemplate.update(
                """
                        UPDATE ops_home_hot_box
                        SET mystery_box_id = ?, enabled = ?
                        WHERE id = ?
                        """,
                request.mysteryBoxId(),
                request.enabled() ? 1 : 0,
                request.id()
        );
        updateBoxCoverIfPresent(request.mysteryBoxId(), request.cover());
        evictHomeCache();
        return request.id();
    }

    @PostMapping("renumber")
    public void renumber() {
        renumberSortOrders();
        evictHomeCache();
    }

    @PostMapping("{id}/cover")
    public void updateCover(@PathVariable String id, @RequestBody CoverUpdateRequest request) {
        if (request.cover() == null || request.cover().isBlank()) {
            throw new BusinessException("请上传封面");
        }
        String mysteryBoxId = jdbcTemplate.query(
                "SELECT mystery_box_id FROM ops_home_hot_box WHERE id = ?",
                rs -> rs.next() ? rs.getString("mystery_box_id") : null,
                id
        );
        if (mysteryBoxId == null) {
            throw new BusinessException("记录不存在");
        }
        jdbcTemplate.update("UPDATE mystery_box SET cover = ? WHERE id = ?", request.cover().trim(), mysteryBoxId);
        evictHomeCache();
    }

    @PostMapping("{id}/enabled")
    public void setEnabled(@PathVariable String id, @RequestParam boolean enabled) {
        int updated = jdbcTemplate.update(
                "UPDATE ops_home_hot_box SET enabled = ? WHERE id = ?",
                enabled ? 1 : 0,
                id
        );
        if (updated == 0) {
            throw new BusinessException("记录不存在");
        }
        evictHomeCache();
    }

    @PostMapping("reorder")
    public void reorder(@RequestBody ReorderRequest request) {
        if (request.ids() == null || request.ids().isEmpty()) {
            throw new BusinessException("排序列表不能为空");
        }
        List<String> current = orderedIds();
        if (request.ids().size() != current.size() || !current.containsAll(request.ids())) {
            throw new BusinessException("排序列表与当前热盒不一致，请刷新后重试");
        }
        persistSortOrders(request.ids());
        evictHomeCache();
    }

    @PostMapping("{id}/reset-cover")
    public void resetCover(@PathVariable String id) {
        String mysteryBoxId = jdbcTemplate.query(
                "SELECT mystery_box_id FROM ops_home_hot_box WHERE id = ?",
                rs -> rs.next() ? rs.getString("mystery_box_id") : null,
                id
        );
        if (mysteryBoxId == null) {
            throw new BusinessException("记录不存在");
        }
        String cover = jdbcTemplate.query(
                """
                        SELECT COALESCE(NULLIF(TRIM(b.cover), ''),
                            (SELECT p.cover FROM mystery_box_product_rel r
                             INNER JOIN product p ON p.id = r.product_id
                             WHERE r.mystery_box_id = b.id
                             ORDER BY r.sort_order ASC LIMIT 1))
                        FROM mystery_box b WHERE b.id = ?
                        """,
                rs -> rs.next() ? rs.getString(1) : null,
                mysteryBoxId
        );
        if (cover == null || cover.isBlank()) {
            throw new BusinessException("该盲盒暂无可用封面");
        }
        jdbcTemplate.update(
                "UPDATE mystery_box SET cover = ? WHERE id = ?",
                normalizeUploadUrl(cover.trim()),
                mysteryBoxId
        );
        evictHomeCache();
    }

    /** 将历史绝对地址统一为 /uploads/... 相对路径 */
    @PostMapping("repair-cover-urls")
    public int repairCoverUrls() {
        List<Map<String, Object>> boxes = jdbcTemplate.queryForList(
                "SELECT id, cover FROM mystery_box WHERE cover IS NOT NULL AND cover <> ''"
        );
        int updated = 0;
        for (Map<String, Object> row : boxes) {
            String boxId = String.valueOf(row.get("id"));
            String cover = String.valueOf(row.get("cover"));
            String normalized = normalizeUploadUrl(cover);
            if (!normalized.equals(cover)) {
                jdbcTemplate.update("UPDATE mystery_box SET cover = ? WHERE id = ?", normalized, boxId);
                updated++;
            }
        }
        evictHomeCache();
        return updated;
    }

    private void evictHomeCache() {
        homeSummaryService.evictSummaryCache();
    }

    private static String normalizeUploadUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        String trimmed = url.trim();
        int uploadsIdx = trimmed.indexOf("/uploads/");
        if (uploadsIdx > 0) {
            return trimmed.substring(uploadsIdx);
        }
        return trimmed;
    }

    @PostMapping("{id}/move")
    public void move(@PathVariable String id, @RequestParam String direction) {
        List<String> ids = orderedIds();
        int index = ids.indexOf(id);
        if (index < 0) {
            throw new BusinessException("记录不存在");
        }
        int targetIndex = switch (direction == null ? "" : direction.trim().toLowerCase()) {
            case "up" -> index - 1;
            case "down" -> index + 1;
            default -> throw new BusinessException("direction 须为 up 或 down");
        };
        if (targetIndex < 0 || targetIndex >= ids.size()) {
            return;
        }
        Collections.swap(ids, index, targetIndex);
        persistSortOrders(ids);
        evictHomeCache();
    }

    private List<String> orderedIds() {
        return new ArrayList<>(jdbcTemplate.queryForList(
                "SELECT id FROM ops_home_hot_box " + ORDER_BY_CLAUSE,
                String.class
        ));
    }

    private void persistSortOrders(List<String> ids) {
        int order = 1;
        for (String rowId : ids) {
            jdbcTemplate.update("UPDATE ops_home_hot_box SET sort_order = ? WHERE id = ?", order++, rowId);
        }
    }

    private int nextSortOrder() {
        Integer max = jdbcTemplate.queryForObject(
                "SELECT COALESCE(MAX(sort_order), 0) FROM ops_home_hot_box",
                Integer.class
        );
        return (max == null ? 0 : max) + 1;
    }

    private void renumberSortOrders() {
        persistSortOrders(orderedIds());
    }

    private void updateBoxCoverIfPresent(String mysteryBoxId, String cover) {
        if (cover == null || cover.isBlank()) {
            return;
        }
        jdbcTemplate.update("UPDATE mystery_box SET cover = ? WHERE id = ?", cover.trim(), mysteryBoxId);
    }

    @DeleteMapping("{id}")
    public void delete(@PathVariable String id) {
        jdbcTemplate.update("DELETE FROM ops_home_hot_box WHERE id = ?", id);
        renumberSortOrders();
        evictHomeCache();
    }

    public record HotBoxSaveRequest(String id, String mysteryBoxId, int sortOrder, boolean enabled, String cover) {
    }

    public record CoverUpdateRequest(String cover) {
    }

    public record ReorderRequest(List<String> ids) {
    }
}
