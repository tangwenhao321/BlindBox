package io.github.qifan777.server.home.controller;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 直连 Controller 验证热盒 CRUD（不经过 HTTP 鉴权）。
 * 无本地 MySQL 时自动跳过。
 */
@SpringBootTest
class OpsHomeHotBoxForAdminControllerIT {
    @Autowired(required = false)
    private OpsHomeHotBoxForAdminController controller;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        String password = System.getenv().getOrDefault("DEV_DB_PASSWORD", "Admin123#");
        registry.add("spring.datasource.url", () -> "jdbc:mysql://localhost:3306/mystery_box");
        registry.add("spring.datasource.username", () -> "root");
        registry.add("spring.datasource.password", () -> password);
        registry.add("spring.data.redis.url", () -> "redis://127.0.0.1:6379/0");
    }

    @Test
    void saveListAndDelete_roundTrip() {
        Assumptions.assumeTrue(controller != null && jdbcTemplate != null);
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        } catch (Exception ex) {
            Assumptions.assumeTrue(false, "MySQL unavailable: " + ex.getMessage());
        }

        String boxId = jdbcTemplate.query(
                "SELECT id FROM mystery_box LIMIT 1",
                rs -> rs.next() ? rs.getString("id") : null
        );
        Assumptions.assumeTrue(boxId != null, "no mystery_box row");

        String id = controller.save(new OpsHomeHotBoxForAdminController.HotBoxSaveRequest(null, boxId, 0, true, null));
        assertThat(id).isNotBlank();

        List<Map<String, Object>> rows = controller.list();
        assertThat(rows).anyMatch(r -> id.equals(r.get("id")) && boxId.equals(r.get("mystery_box_id")));

        if (rows.size() >= 2) {
            String firstId = rows.get(0).get("id").toString();
            String secondId = rows.get(1).get("id").toString();
            jdbcTemplate.update("UPDATE ops_home_hot_box SET sort_order = 1");
            controller.move(secondId, "up");
            List<Map<String, Object>> afterMove = controller.list();
            assertThat(afterMove.get(0).get("id")).isEqualTo(secondId);
            assertThat(afterMove.get(1).get("id")).isEqualTo(firstId);
        }

        controller.setEnabled(id, false);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT enabled FROM ops_home_hot_box WHERE id = ?",
                Integer.class,
                id
        )).isZero();
        controller.setEnabled(id, true);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT enabled FROM ops_home_hot_box WHERE id = ?",
                Integer.class,
                id
        )).isEqualTo(1);

        controller.delete(id);
        assertThat(controller.list().stream().noneMatch(r -> id.equals(r.get("id")))).isTrue();
    }
}
