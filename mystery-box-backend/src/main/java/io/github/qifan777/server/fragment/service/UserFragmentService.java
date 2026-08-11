package io.github.qifan777.server.fragment.service;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItemDraft;
import io.github.qifan777.server.box.order.OrderIds;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrderDraft;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.root.entity.dto.MystryBoxView;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.fragment.model.FragmentProgressView;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.entity.Payment;
import io.github.qifan777.server.payment.entity.PaymentDraft;
import io.github.qifan777.server.payment.gateway.PaymentGatewayRegistry;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static io.github.qifan777.server.dict.model.DictConstants.ProductOrderStatus;

@Service
@RequiredArgsConstructor
public class UserFragmentService {
    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final ProductRepository productRepository;
    private final PaymentGatewayRegistry paymentGatewayRegistry;
    private final MarketProperties marketProperties;

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
                "SELECT id, name, cover, fragment_cost, stock_remaining, product_id FROM fragment_exchange_sku WHERE enabled = 1 ORDER BY sort_order ASC",
                (rs, rowNum) -> new FragmentSkuView(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("cover"),
                        rs.getInt("fragment_cost"),
                        rs.getInt("stock_remaining"),
                        rs.getString("product_id")
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
        String idemKey = "DECOMPOSE:" + orderItemId + ":" + productId;
        int fragments = resolveDecomposeFragments(target);
        if (!tryInsertIdempotentLog(userId, fragments, "分解仓库奖品", orderItemId, idemKey)) {
            throw new BusinessException("奖品不存在或已分解");
        }
        products.remove(target);
        mysteryBoxOrderItemRepository.updateProducts(orderItemId, products);
        applyBalanceCredit(userId, fragments, idemKey);
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
            int byPrice = MoneyRounding.round(product.getPrice(), marketProperties.getCurrency())
                    .setScale(0, java.math.RoundingMode.HALF_UP)
                    .intValue() / 10;
            byPrice = Math.max(5, Math.min(80, byPrice));
            return Math.max(byQuality, byPrice);
        }
        return byQuality;
    }

    @Transactional
    public void exchangeSku(String userId, String skuId, String clientIdempotencyKey) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT fragment_cost, stock_remaining, name, cover, product_id FROM fragment_exchange_sku WHERE id = ? AND enabled = 1",
                skuId
        );
        if (rows.isEmpty()) {
            throw new BusinessException("兑换商品不存在");
        }
        Map<String, Object> sku = rows.get(0);
        int cost = ((Number) sku.get("fragment_cost")).intValue();
        String productId = resolveProductId(sku);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException("兑换商品未绑定有效奖品，暂不可兑换"));
        ProductView productView = new ProductView(product);

        String idemKey = StringUtils.hasText(clientIdempotencyKey)
                ? "EXCHANGE:" + userId + ":" + skuId + ":" + clientIdempotencyKey.trim()
                : null;
        if (idemKey == null) {
            throw new BusinessException("缺少幂等键 x-idempotency-key，请重试");
        }
        if (!tryInsertIdempotentLog(userId, -cost, "兑换 " + sku.get("name"), null, idemKey)) {
            // Already exchanged with this client key — treat as success (idempotent).
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        int balRows = jdbcTemplate.update(
                """
                        UPDATE user_fragment
                        SET balance = balance - ?, edited_time = ?
                        WHERE user_id = ? AND fragment_code = 'default' AND balance >= ?
                        """,
                cost,
                now,
                userId,
                cost
        );
        if (balRows != 1) {
            throw new BusinessException("碎片不足，需要 " + cost + "，当前 " + balance(userId));
        }
        int stockRows = jdbcTemplate.update(
                """
                        UPDATE fragment_exchange_sku
                        SET stock_remaining = stock_remaining - 1
                        WHERE id = ? AND enabled = 1 AND stock_remaining > 0
                        """,
                skuId
        );
        if (stockRows != 1) {
            throw new BusinessException("兑换商品已售罄");
        }
        jdbcTemplate.update(
                "UPDATE user_fragment_log SET balance_after = ?, remark = ? WHERE idempotency_key = ?",
                balance(userId),
                "兑换 " + sku.get("name"),
                idemKey
        );
        grantExchangeToWarehouse(userId, productView, skuId, String.valueOf(sku.get("name")));
    }

    /** @deprecated use {@link #exchangeSku(String, String, String)} */
    @Transactional
    public void exchangeSku(String userId, String skuId) {
        exchangeSku(userId, skuId, null);
    }

    private String resolveProductId(Map<String, Object> sku) {
        Object configured = sku.get("product_id");
        if (configured != null && StringUtils.hasText(String.valueOf(configured))) {
            return String.valueOf(configured);
        }
        String name = String.valueOf(sku.get("name"));
        List<String> byName = jdbcTemplate.query(
                "SELECT id FROM product WHERE name = ? LIMIT 1",
                (rs, rowNum) -> rs.getString(1),
                name
        );
        if (!byName.isEmpty()) {
            return byName.get(0);
        }
        throw new BusinessException("兑换商品未绑定奖品，暂不可兑换");
    }

    private void grantExchangeToWarehouse(String userId, ProductView product, String skuId, String skuName) {
        String orderId = OrderIds.next();
        LocalDateTime now = LocalDateTime.now();
        MystryBoxView boxSnap = new MystryBoxView();
        boxSnap.setId("FRAGMENT_EXCHANGE");
        boxSnap.setName(StringUtils.hasText(skuName) ? skuName : "碎片兑换");
        boxSnap.setCover(product.getCover() == null ? "" : product.getCover());
        boxSnap.setPrice(BigDecimal.ZERO);
        boxSnap.setDetails("FRAGMENT_EXCHANGE");
        boxSnap.setTips(skuId);
        boxSnap.setProducts(Collections.<MystryBoxView.TargetOf_products>emptyList());

        Payment payment = PaymentDraft.$.produce(draft -> draft
                .setId(orderId)
                .setPayType(paymentGatewayRegistry.resolveForMarket().payType())
                .setPayAmount(BigDecimal.ZERO)
                .setCouponAmount(BigDecimal.ZERO)
                .setVipAmount(BigDecimal.ZERO)
                .setProductAmount(BigDecimal.ZERO)
                .setDeliveryFee(BigDecimal.ZERO)
                .setPayTime(now)
                .setTradeNo("FRAGMENT:" + skuId));

        MysteryBoxOrder entity = MysteryBoxOrderDraft.$.produce(draft -> {
            draft.setId(orderId)
                    .setStatus(ProductOrderStatus.TO_BE_DELIVERED)
                    .setItems(List.of(MysteryBoxOrderItemDraft.$.produce(item -> item
                            .setMysteryBoxOrderId(orderId)
                            .setMysteryBoxId("FRAGMENT_EXCHANGE")
                            .setMysteryBoxCount(1)
                            .setMysteryBox(boxSnap)
                            .setProducts(List.of(product)))));
            draft.baseOrder()
                    .setId(orderId)
                    .setType(DictConstants.OrderType.PRODUCT_ORDER)
                    .setPayment(payment)
                    .setRemark("FRAGMENT_EXCHANGE:" + skuId + ";userId:" + userId);
        });
        mysteryBoxOrderRepository.save(entity);
    }

    private boolean tryInsertIdempotentLog(
            String userId,
            int amount,
            String remark,
            String relatedItemId,
            String idempotencyKey
    ) {
        try {
            jdbcTemplate.update(
                    """
                            INSERT INTO user_fragment_log
                                (id, user_id, change_amount, balance_after, remark, related_order_item_id,
                                 created_time, idempotency_key)
                            VALUES (?,?,?,?,?,?,?,?)
                            """,
                    IdUtil.fastSimpleUUID(),
                    userId,
                    amount,
                    0,
                    remark,
                    relatedItemId,
                    LocalDateTime.now(),
                    idempotencyKey
            );
            return true;
        } catch (DuplicateKeyException dup) {
            return false;
        }
    }

    private void applyBalanceCredit(String userId, int amount, String idempotencyKey) {
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
                "UPDATE user_fragment_log SET balance_after = ? WHERE idempotency_key = ?",
                balance(userId),
                idempotencyKey
        );
    }

    public record FragmentSkuView(
            String id,
            String name,
            String cover,
            int fragmentCost,
            int stockRemaining,
            String productId
    ) {
        public FragmentSkuView(String id, String name, String cover, int fragmentCost, int stockRemaining) {
            this(id, name, cover, fragmentCost, stockRemaining, null);
        }
    }
}
