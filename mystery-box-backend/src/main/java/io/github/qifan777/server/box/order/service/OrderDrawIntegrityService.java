package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.dict.model.ProductOrderStatus;

import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.box.root.entity.dto.MystryBoxView;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderDrawIntegrityService {

    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;

    public OrderDrawIntegrityView checkForCurrentUser(String orderId) {
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!order.creator().id().equals(StpUtil.getLoginIdAsString())) {
            throw new BusinessException("无权查看该订单");
        }
        return check(order);
    }

    public OrderDrawIntegrityView check(MysteryBoxOrder order) {
        List<String> issues = new ArrayList<>();
        int expectedDraws = 0;
        int actualPrizes = 0;

        for (MysteryBoxOrderItem item : order.items()) {
            int count = Math.max(item.mysteryBoxCount(), 0);
            expectedDraws += count;
            List<ProductView> products = item.products() == null ? List.of() : item.products();
            actualPrizes += products.size();

            if (order.status() != ProductOrderStatus.TO_BE_PAID && count > 0) {
                if (products.isEmpty()) {
                    issues.add("订单行 " + item.id() + " 已支付但无开奖奖品");
                } else if (products.size() < count) {
                    issues.add("订单行 " + item.id() + " 奖品数 " + products.size() + " 少于抽数 " + count);
                } else if (products.size() > count + 1) {
                    issues.add("订单行 " + item.id() + " 奖品数 " + products.size() + " 超过抽数+终赏上限 " + (count + 1));
                }
                for (ProductView p : products) {
                    if (!hasCover(p)) {
                        issues.add("奖品 " + safeProductId(p) + " 缺少封面 cover");
                        break;
                    }
                }
            }
            if (item.mysteryBox() != null && !hasCover(item.mysteryBox())) {
                issues.add("订单行盲盒快照缺少封面");
            }
        }

        boolean ok = issues.isEmpty();
        String message = ok
                ? "开奖数量与订单抽数一致"
                : String.join("；", issues);
        return new OrderDrawIntegrityView(ok, expectedDraws, actualPrizes, issues.size(), message, issues);
    }

    private static boolean hasCover(ProductView product) {
        if (product == null) {
            return false;
        }
        try {
            String cover = product.getCover();
            return cover != null && !cover.isBlank();
        } catch (IllegalStateException ex) {
            return false;
        }
    }

    private static boolean hasCover(MystryBoxView box) {
        if (box == null) {
            return false;
        }
        try {
            String cover = box.getCover();
            return cover != null && !cover.isBlank();
        } catch (IllegalStateException ex) {
            return false;
        }
    }

    private static String safeProductId(ProductView product) {
        try {
            return product.getId();
        } catch (IllegalStateException ex) {
            return "unknown";
        }
    }

    public record OrderDrawIntegrityView(
            boolean ok,
            int expectedDrawCount,
            int actualPrizeCount,
            int issueCount,
            String message,
            List<String> issues
    ) {
    }
}
