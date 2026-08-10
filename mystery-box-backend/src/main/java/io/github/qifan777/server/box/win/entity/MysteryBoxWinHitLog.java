package io.github.qifan777.server.box.win.entity;

import io.github.qifan777.server.infrastructure.jimmer.BaseEntity;
import io.qifan.infrastructure.generator.core.GenEntity;
import org.babyfish.jimmer.sql.Entity;

@GenEntity
@Entity
public interface MysteryBoxWinHitLog extends BaseEntity {

    String ruleId();

    String userId();

    String mysteryBoxOrderId();

    String mysteryBoxOrderItemId();

    String mysteryBoxId();

    String originalProductId();

    String designatedProductId();

    String remark();
}
