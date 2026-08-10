package io.github.qifan777.server.box.draw.entity;

import io.github.qifan777.server.infrastructure.jimmer.UUIDIdGenerator;
import org.babyfish.jimmer.sql.Column;
import org.babyfish.jimmer.sql.Entity;
import org.babyfish.jimmer.sql.GeneratedValue;
import org.babyfish.jimmer.sql.Id;
import org.babyfish.jimmer.sql.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "mystery_box_draw_log")
public interface MysteryBoxDrawLog {
    @Id
    @GeneratedValue(generatorType = UUIDIdGenerator.class)
    String id();

    String userId();

    String mysteryBoxId();

    String productId();

    String productName();

    String qualityType();

    String mysteryBoxOrderId();

    @Column(name = "is_last_one")
    boolean lastOne();

    String fairnessSeed();

    String fairnessHash();

    LocalDateTime createdTime();
}
