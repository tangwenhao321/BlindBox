package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.root.entity.dto.MystryBoxView;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderDrawIntegrityServiceTest {

    @InjectMocks
    private OrderDrawIntegrityService service;

    @Test
    void check_okWhenPrizeCountMatchesDraws() {
        MysteryBoxOrder order = mock(MysteryBoxOrder.class);
        MysteryBoxOrderItem item = mock(MysteryBoxOrderItem.class);
        ProductView product = mock(ProductView.class);
        MystryBoxView box = mock(MystryBoxView.class);

        when(order.status()).thenReturn(DictConstants.ProductOrderStatus.TO_BE_DELIVERED);
        when(order.items()).thenReturn(List.of(item));
        when(item.mysteryBoxCount()).thenReturn(2);
        when(item.products()).thenReturn(List.of(product, product));
        when(item.mysteryBox()).thenReturn(box);
        when(product.getCover()).thenReturn("https://cdn.example/p.png");
        when(box.getCover()).thenReturn("https://cdn.example/b.png");

        OrderDrawIntegrityService.OrderDrawIntegrityView view = service.check(order);
        assertThat(view.ok()).isTrue();
        assertThat(view.expectedDrawCount()).isEqualTo(2);
        assertThat(view.actualPrizeCount()).isEqualTo(2);
    }

    @Test
    void check_failsWhenPrizeCountBelowDraws() {
        MysteryBoxOrder order = mock(MysteryBoxOrder.class);
        MysteryBoxOrderItem item = mock(MysteryBoxOrderItem.class);
        MystryBoxView box = mock(MystryBoxView.class);

        when(order.status()).thenReturn(DictConstants.ProductOrderStatus.FINISHED);
        when(order.items()).thenReturn(List.of(item));
        when(item.mysteryBoxCount()).thenReturn(5);
        when(item.id()).thenReturn("line-2");
        when(item.products()).thenReturn(List.of());
        when(item.mysteryBox()).thenReturn(box);
        when(box.getCover()).thenReturn("cover");

        OrderDrawIntegrityService.OrderDrawIntegrityView view = service.check(order);
        assertThat(view.ok()).isFalse();
        assertThat(view.issueCount()).isGreaterThan(0);
    }
}
