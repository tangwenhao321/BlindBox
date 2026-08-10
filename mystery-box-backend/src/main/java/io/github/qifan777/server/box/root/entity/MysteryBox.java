package io.github.qifan777.server.box.root.entity;

import io.github.qifan777.server.box.category.entity.MysteryBoxCategory;
import io.github.qifan777.server.box.product.entity.MysteryBoxProductRel;
import io.github.qifan777.server.infrastructure.jimmer.BaseEntity;
import io.github.qifan777.server.product.root.entity.Product;
import io.qifan.infrastructure.generator.core.GenBooleanField;
import io.qifan.infrastructure.generator.core.*;
import org.babyfish.jimmer.sql.Entity;
import org.babyfish.jimmer.sql.ManyToManyView;
import org.babyfish.jimmer.sql.ManyToOne;
import org.babyfish.jimmer.sql.OneToMany;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * 盲盒
 */
@GenEntity
@Entity
public interface MysteryBox extends BaseEntity {

    /**
     * 盲盒名字
     */
    @GenTextField(label = "盲盒名字", order = 0)
    String name();

    /**
     * 盲盒详情
     */
    @GenTextAreaField(label = "盲盒详情", order = 1)
    String details();

    /**
     * 购买提示
     */
    @GenTextField(label = "购买提示", order = 2)
    String tips();

    /**
     * 价格
     */
    @GenNumberField(label = "价格", order = 3)
    BigDecimal price();

    /**
     * 超神款概率（万分比）
     */
    @Min(0)
    @Max(10000)
    @GenNumberField(label = "超神概率(万分比)", order = 4)
    int legendaryRate();

    /**
     * 隐藏款概率（万分比）
     */
    @Min(0)
    @Max(10000)
    @GenNumberField(label = "隐藏概率(万分比)", order = 5)
    int hiddenRate();

    /**
     * 普通款概率（万分比）
     */
    @Min(0)
    @Max(10000)
    @GenNumberField(label = "普通概率(万分比)", order = 6)
    int generalRate();

    /**
     * 封面
     */
    @GenImageField(label = "封面", order = 7)
    String cover();

    /**
     * 新人专享（仅未开盒用户可购买）
     */
    @GenBooleanField(label = "新人专享", order = 8)
    boolean newcomerExclusive();

    /**
     * 奖池总票数（一番赏式公示）
     */
    @Min(0)
    @GenNumberField(label = "奖池总票数", order = 9)
    int poolTotal();

    /**
     * 奖池剩余票数
     */
    @Min(0)
    @GenNumberField(label = "奖池剩余票数", order = 10)
    int poolRemaining();

    @Min(1)
    @GenNumberField(label = "保底阈值", order = 11)
    int pityThreshold();

    @OneToMany(mappedBy = "mysteryBox")
    List<MysteryBoxProductRel> boxRelList();

    @ManyToManyView(prop = "boxRelList")
    List<Product> products();

    @ManyToOne
    MysteryBoxCategory category();
}

