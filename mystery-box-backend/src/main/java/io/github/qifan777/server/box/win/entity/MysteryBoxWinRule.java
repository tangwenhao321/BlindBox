package io.github.qifan777.server.box.win.entity;

import io.github.qifan777.server.infrastructure.jimmer.BaseEntity;
import io.qifan.infrastructure.generator.core.GenEntity;
import org.babyfish.jimmer.sql.Entity;
import org.babyfish.jimmer.sql.IdView;
import org.babyfish.jimmer.sql.ManyToOne;

import java.time.LocalDateTime;

@GenEntity
@Entity
public interface MysteryBoxWinRule extends BaseEntity {

    /**
     * 目标用户id
     */
    String userId();

    /**
     * 目标盲盒id
     */
    String mysteryBoxId();

    /**
     * 指定中奖商品id
     */
    String productId();

    /**
     * 剩余生效次数
     */
    int remainingCount();

    /**
     * 是否启用
     */
    boolean enabled();

    /**
     * 是否审批通过
     */
    boolean approved();

    /**
     * 审批人
     */
    @ManyToOne
    io.github.qifan777.server.user.root.entity.User approvedBy();

    @IdView("approvedBy")
    String approvedById();

    /**
     * 审批时间
     */
    LocalDateTime approvedTime();

    /**
     * 备注
     */
    String remark();
}
