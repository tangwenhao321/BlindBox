package io.github.qifan777.server.activity.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.hutool.core.util.IdUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/mystery-box-activity")
@RequiredArgsConstructor
@SaCheckPermission("/mystery-box")
@Transactional
public class MysteryBoxActivityForAdminController {
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbcTemplate.queryForList(
                "SELECT id, title, banner, subtitle, end_time, box_ids, enabled, sort_order, view_count FROM mystery_box_activity ORDER BY sort_order ASC"
        );
    }

    @PostMapping("save")
    public String save(@RequestBody ActivitySaveRequest request) {
        String boxIdsJson;
        try {
            boxIdsJson = objectMapper.writeValueAsString(request.boxIds() == null ? List.of() : request.boxIds());
        } catch (Exception ex) {
            throw new BusinessException("boxIds 格式错误");
        }
        if (request.id() == null || request.id().isBlank()) {
            String id = IdUtil.fastSimpleUUID();
            jdbcTemplate.update(
                    """
                            INSERT INTO mystery_box_activity (id, title, banner, subtitle, end_time, box_ids, enabled, sort_order)
                            VALUES (?,?,?,?,?,?,?,?)
                            """,
                    id,
                    request.title(),
                    request.banner(),
                    request.subtitle(),
                    request.endTime(),
                    boxIdsJson,
                    request.enabled() ? 1 : 0,
                    request.sortOrder()
            );
            return id;
        }
        jdbcTemplate.update(
                """
                        UPDATE mystery_box_activity
                        SET title = ?, banner = ?, subtitle = ?, end_time = ?, box_ids = ?, enabled = ?, sort_order = ?
                        WHERE id = ?
                        """,
                request.title(),
                request.banner(),
                request.subtitle(),
                request.endTime(),
                boxIdsJson,
                request.enabled() ? 1 : 0,
                request.sortOrder(),
                request.id()
        );
        return request.id();
    }

    @DeleteMapping("{id}")
    public void delete(@PathVariable String id) {
        jdbcTemplate.update("DELETE FROM mystery_box_activity WHERE id = ?", id);
    }

    public record ActivitySaveRequest(
            String id,
            String title,
            String banner,
            String subtitle,
            LocalDateTime endTime,
            List<String> boxIds,
            boolean enabled,
            int sortOrder
    ) {
    }
}
