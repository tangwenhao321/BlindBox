package io.github.qifan777.server.box.win.entity;

import io.github.qifan777.server.infrastructure.jimmer.BaseEntity;
import io.qifan.infrastructure.generator.core.GenEntity;
import org.babyfish.jimmer.sql.Entity;

@GenEntity
@Entity
public interface MysteryBoxWinRuleOpLog extends BaseEntity {
    String ruleId();

    String action();

    String operatorId();

    String detail();
}

