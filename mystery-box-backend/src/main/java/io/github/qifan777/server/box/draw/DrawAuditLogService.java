package io.github.qifan777.server.box.draw;

import cn.hutool.core.util.IdUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DrawAuditLogService {
    private final JdbcTemplate jdbcTemplate;

    public void append(
            String userId,
            String boxId,
            String orderId,
            int baseLegendary,
            int baseHidden,
            int baseGeneral,
            int adjLegendary,
            int adjHidden,
            int adjGeneral,
            String configVersion,
            String resultProductId,
            String resultTier
    ) {
        jdbcTemplate.update(
                """
                        INSERT INTO draw_audit_log (
                            id, user_id, box_id, order_id,
                            base_legendary, base_hidden, base_general,
                            adj_legendary, adj_hidden, adj_general,
                            config_version, result_product_id, result_tier, created_time
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                IdUtil.fastSimpleUUID(),
                userId,
                boxId,
                orderId,
                baseLegendary,
                baseHidden,
                baseGeneral,
                adjLegendary,
                adjHidden,
                adjGeneral,
                configVersion == null ? "" : configVersion,
                resultProductId,
                resultTier,
                LocalDateTime.now()
        );
    }
}
