package io.github.qifan777.server.fragment.service;

import cn.hutool.core.util.IdUtil;
import cn.dev33.satoken.stp.StpUtil;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.github.qifan777.server.fragment.model.FragmentProgressView;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;

@Service
@RequiredArgsConstructor
public class UserFragmentService {
    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;

    public int balance(String userId) {
        List<Integer> values = jdbcTemplate.query(
                "SELECT balance FROM user_fragment WHERE user_id = ? AND fragment_code = 'default' LIMIT 1",
                (rs, rowNum) -> rs.getInt("balance"),
                userId
        );
        return values.isEmpty() ? 0 : values.get(0);
    }

    public List<FragmentSkuView> listSkus() {
        return jdbcTemplate.query(
                "SELECT id, name, cover, fragment_cost, stock_remaining FROM fragment_exchange_sku WHERE enabled = 1 ORDER BY sort_order ASC",
                (rs, rowNum) -> new FragmentSkuView(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("cover"),
                        rs.getInt("fragment_cost"),
                        rs.getInt("stock_remaining")
                )
        );
    }

    public FragmentProgressView progress(String userId) {
        int bal = balance(userId);
        List<FragmentSkuView> skus = listSkus();
        int affordable = 0;
        List<FragmentProgressView.SkuProgress> items = skus.stream().map(sku -> {
            boolean can = bal >= sku.fragmentCost() && sku.stockRemaining() > 0;
            double pct = sku.fragmentCost() <= 0 ? 100.0 : Math.min(100.0, bal * 100.0 / sku.fragmentCost());
            return new FragmentProgressView.SkuProgress(
                    sku.id(),
                    sku.name(),
                    sku.cover(),
                    sku.fragmentCost(),
                    sku.stockRemaining(),
                    can,
                    pct
            );
        }).toList();
        for (FragmentProgressView.SkuProgress item : items) {
            if (item.affordable()) {
                affordable++;
            }
        }
        return new FragmentProgressView(bal, skus.size(), affordable, items);
    }

    @Transactional
    public void decomposeOrderItem(String userId, String orderItemId, String productId) {
        MysteryBoxOrderItem item = mysteryBoxOrderItemRepository.findByIdWithProducts(orderItemId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "订单项不存在"));
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(item.mysteryBoxOrderId());
        if (!order.creator().id().equals(userId)) {
            throw new BusinessException("无权操作该订单");
        }
        if (!ProductOrderStatus.TO_BE_DELIVERED.equals(order.status())
                && !ProductOrderStatus.TO_BE_RECEIVED.equals(order.status())) {
            throw new BusinessException("当前订单状态不可分解");
        }
        List<ProductView> stored = item.products();
        if (stored == null || stored.isEmpty()) {
            throw new BusinessException("奖品不存在或已分解");
        }
        List<ProductView> products = new ArrayList<>(stored);
        ProductView target = products.stream()
                .filter(p -> p != null && p.getId() != null && productId.equals(p.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("奖品不存在或已分解"));
        products.remove(target);
        int fragments = resolveDecomposeFragments(target);
        mysteryBoxOrderItemRepository.updateProducts(orderItemId, products);
        addBalance(userId, fragments, "分解仓库奖品", orderItemId);
    }

    private int resolveDecomposeFragments(ProductView product) {
        String quality = "";
        if (product.getQualityType() != null) {
            quality = product.getQualityType().getKeyEnName().toUpperCase();
        }
        int byQuality = switch (quality) {
            case "LEGENDARY", "LEGEND" -> 50;
            case "EPIC" -> 25;
            case "RARE" -> 15;
            default -> 8;
        };
        if (product.getPrice() != null && product.getPrice().signum() > 0) {
            int byPrice = product.getPrice().intValue() / 10;
            byPrice = Math.max(5, Math.min(80, byPrice));
            return Math.max(byQuality, byPrice);
        }
        return byQuality;
    }

    @Transactional
    public void exchangeSku(String userId, String skuId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT fragment_cost, stock_remaining, name FROM fragment_exchange_sku WHERE id = ? AND enabled = 1",
                skuId
        );
        if (rows.isEmpty()) {
            throw new BusinessException("兑换商品不存在");
        }
        int cost = ((Number) rows.get(0).get("fragment_cost")).intValue();
        int stock = ((Number) rows.get(0).get("stock_remaining")).intValue();
        if (stock <= 0) {
            throw new BusinessException("兑换商品已售罄");
        }
        int current = balance(userId);
        if (current < cost) {
            throw new BusinessException("碎片不足，需要 " + cost + "，当前 " + current);
        }
        jdbcTemplate.update(
                "UPDATE user_fragment SET balance = balance - ?, edited_time = ? WHERE user_id = ? AND fragment_code = 'default'",
                cost,
                LocalDateTime.now(),
                userId
        );
        jdbcTemplate.update(
                "UPDATE fragment_exchange_sku SET stock_remaining = stock_remaining - 1 WHERE id = ? AND stock_remaining > 0",
                skuId
        );
        jdbcTemplate.update(
                "INSERT INTO user_fragment_log (id, user_id, change_amount, balance_after, remark, created_time) VALUES (?,?,?,?,?,?)",
                IdUtil.fastSimpleUUID(),
                userId,
                -cost,
                current - cost,
                "兑换 " + rows.get(0).get("name"),
                LocalDateTime.now()
        );
    }

    private void addBalance(String userId, int amount, String remark, String relatedItemId) {
        int current = balance(userId);
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM user_fragment WHERE user_id = ? AND fragment_code = 'default'",
                Integer.class,
                userId
        );
        if (count != null && count > 0) {
            jdbcTemplate.update(
                    "UPDATE user_fragment SET balance = balance + ?, edited_time = ? WHERE user_id = ? AND fragment_code = 'default'",
                    amount,
                    LocalDateTime.now(),
                    userId
            );
        } else {
            jdbcTemplate.update(
                    "INSERT INTO user_fragment (id, user_id, fragment_code, balance, edited_time) VALUES (?,?,?,?,?)",
                    IdUtil.fastSimpleUUID(),
                    userId,
                    "default",
                    amount,
                    LocalDateTime.now()
            );
        }
        jdbcTemplate.update(
                "INSERT INTO user_fragment_log (id, user_id, change_amount, balance_after, remark, related_order_item_id, created_time) VALUES (?,?,?,?,?,?,?)",
                IdUtil.fastSimpleUUID(),
                userId,
                amount,
                current + amount,
                remark,
                relatedItemId,
                LocalDateTime.now()
        );
    }

    public record FragmentSkuView(String id, String name, String cover, int fragmentCost, int stockRemaining) {
    }
}
