package io.github.qifan777.server.box.item.repository;

import io.github.qifan777.server.Tables;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItemTable;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItemFetcher;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import org.babyfish.jimmer.spring.repository.JRepository;

import java.util.List;
import java.util.Optional;

public interface MysteryBoxOrderItemRepository extends JRepository<MysteryBoxOrderItem, String> {
    MysteryBoxOrderItemTable t = Tables.MYSTERY_BOX_ORDER_ITEM_TABLE;

    default Optional<MysteryBoxOrderItem> findByIdWithProducts(String id) {
        return sql().createQuery(t)
                .where(t.id().eq(id))
                .select(t.fetch(MysteryBoxOrderItemFetcher.$.mysteryBoxOrderId().products()))
                .fetchOptional();
    }

    default void updateProducts(String id, List<ProductView> productViews) {
        sql()
                .createUpdate(t)
                .where(t.id().eq(id))
                .set(t.products(), productViews)
                .execute();
    }
}
