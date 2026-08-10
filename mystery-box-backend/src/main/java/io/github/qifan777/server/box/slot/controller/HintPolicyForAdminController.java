package io.github.qifan777.server.box.slot.controller;

import cn.dev33.satoken.annotation.SaCheckRole;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("admin/hint-policy")
@RequiredArgsConstructor
@SaCheckRole("管理员")
@Transactional
public class HintPolicyForAdminController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbcTemplate.queryForList(
                """
                        SELECT id, config_key, config_value, description, updated_time
                        FROM hint_policy_config
                        ORDER BY config_key ASC
                        """
        );
    }

    @PostMapping("save")
    public void save(@RequestBody SaveRequest request) {
        if (request.configKey() == null || request.configKey().isBlank()) {
            throw new BusinessException("配置键不能为空");
        }
        if (request.configValue() < 0) {
            throw new BusinessException("配置值不能为负数");
        }
        int updated = jdbcTemplate.update(
                """
                        UPDATE hint_policy_config
                        SET config_value = ?, description = COALESCE(?, description), updated_time = ?
                        WHERE config_key = ?
                        """,
                request.configValue(),
                request.description(),
                LocalDateTime.now(),
                request.configKey().trim()
        );
        if (updated == 0) {
            throw new BusinessException("配置项不存在: " + request.configKey());
        }
    }

    public record SaveRequest(String configKey, int configValue, String description) {
    }
}
