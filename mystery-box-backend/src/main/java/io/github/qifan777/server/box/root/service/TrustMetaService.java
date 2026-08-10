package io.github.qifan777.server.box.root.service;

import io.github.qifan777.server.box.root.entity.MysteryBox;
import io.github.qifan777.server.box.root.model.TrustMetaView;
import io.github.qifan777.server.box.root.repository.MysteryBoxRepository;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TrustMetaService {
    private final MysteryBoxRepository mysteryBoxRepository;
    private final JdbcTemplate jdbcTemplate;

    public TrustMetaView meta(String mysteryBoxId) {
        MysteryBox box = mysteryBoxRepository.findById(mysteryBoxId)
                .orElseThrow(() -> new BusinessException("盲盒不存在"));
        LocalDateTime probabilityAt = jdbcTemplate.query(
                """
                        SELECT created_time FROM mystery_box_probability_history
                        WHERE mystery_box_id = ? ORDER BY created_time DESC LIMIT 1
                        """,
                rs -> rs.next() ? rs.getTimestamp("created_time").toLocalDateTime() : box.editedTime(),
                mysteryBoxId
        );
        return new TrustMetaView(
                probabilityAt,
                "付款后 3 个工作日内录入物流信息（节假日顺延）",
                "未满 18 周岁请勿下单，监护人应履行监护职责",
                "概率与库存以本页公示为准，开奖结果随机生成"
        );
    }
}
