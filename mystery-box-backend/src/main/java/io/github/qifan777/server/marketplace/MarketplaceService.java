package io.github.qifan777.server.marketplace;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MarketplaceService {
    @Value("${app.marketplace.fee-rate:0.05}")
    private BigDecimal marketplaceFeeRate;

    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final UserWalletService userWalletService;
    private final UserNotificationService userNotificationService;

    private static final RowMapper<MarketplaceListingView> LISTING_ROW_MAPPER = (rs, rowNum) ->
            new MarketplaceListingView(
                    rs.getString("id"),
                    rs.getString("seller_user_id"),
                    rs.getString("mystery_box_order_id"),
                    rs.getString("mystery_box_order_item_id"),
                    rs.getString("product_id"),
                    rs.getString("product_name"),
                    rs.getString("cover"),
                    rs.getString("quality_type"),
                    rs.getBigDecimal("price"),
                    rs.getString("status"),
                    rs.getTimestamp("created_time").toLocalDateTime()
            );

    public List<MarketplaceListingView> listOnSale(int limit, int offset, String keyword, String sort, BigDecimal minPrice, BigDecimal maxPrice) {
        int size = Math.min(Math.max(limit, 1), 50);
        int off = Math.max(offset, 0);
        String orderBy = resolveSort(sort);
        StringBuilder sql = new StringBuilder("""
                SELECT id, seller_user_id, mystery_box_order_id, mystery_box_order_item_id,
                       product_id, product_name, cover, quality_type, price, status, created_time
                FROM marketplace_listing
                WHERE status = 'ON_SALE'
                """);
        List<Object> args = new ArrayList<>();
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (product_name LIKE ? OR quality_type LIKE ?)");
            String like = "%" + keyword.trim() + "%";
            args.add(like);
            args.add(like);
        }
        if (minPrice != null) {
            sql.append(" AND price >= ?");
            args.add(minPrice);
        }
        if (maxPrice != null) {
            sql.append(" AND price <= ?");
            args.add(maxPrice);
        }
        sql.append(" ORDER BY ").append(orderBy).append(" LIMIT ? OFFSET ?");
        args.add(size);
        args.add(off);
        return jdbcTemplate.query(sql.toString(), LISTING_ROW_MAPPER, args.toArray());
    }

    public List<MarketplaceListingView> listOnSale(int limit, String keyword, String sort, BigDecimal minPrice, BigDecimal maxPrice) {
        return listOnSale(limit, 0, keyword, sort, minPrice, maxPrice);
    }

    private static String resolveSort(String sort) {
        if ("price_asc".equalsIgnoreCase(sort)) {
            return "price ASC, created_time DESC";
        }
        if ("price_desc".equalsIgnoreCase(sort)) {
            return "price DESC, created_time DESC";
        }
        return "created_time DESC";
    }

    public List<MarketplaceListingView> listOnSale(int limit, String keyword) {
        return listOnSale(limit, keyword, "newest", null, null);
    }

    public List<PurchasedListingView> listPurchasedByBuyer(String buyerUserId, int limit) {
        int size = Math.min(Math.max(limit, 1), 50);
        return jdbcTemplate.query(
                """
                        SELECT id, product_name, cover, quality_type, price, buyer_ship_status, sold_time
                        FROM marketplace_listing
                        WHERE buyer_user_id = ? AND status = 'SOLD'
                        ORDER BY sold_time DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new PurchasedListingView(
                        rs.getString("id"),
                        rs.getString("product_name"),
                        rs.getString("cover"),
                        rs.getString("quality_type"),
                        rs.getBigDecimal("price"),
                        rs.getString("buyer_ship_status"),
                        rs.getTimestamp("sold_time") == null ? null : rs.getTimestamp("sold_time").toLocalDateTime()
                ),
                buyerUserId,
                size
        );
    }

    public List<MarketplaceListingView> listBySeller(String sellerUserId, int limit) {
        int size = Math.min(Math.max(limit, 1), 50);
        return jdbcTemplate.query(
                """
                        SELECT id, seller_user_id, mystery_box_order_id, mystery_box_order_item_id,
                               product_id, product_name, cover, quality_type, price, status, created_time
                        FROM marketplace_listing
                        WHERE seller_user_id = ?
                        ORDER BY created_time DESC
                        LIMIT ?
                        """,
                LISTING_ROW_MAPPER,
                sellerUserId,
                size
        );
    }

    @Transactional
    public String createListing(
            String sellerUserId,
            String orderId,
            String orderItemId,
            String productId,
            BigDecimal price
    ) {
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("挂牌价格须大于 0");
        }
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!order.creator().id().equals(sellerUserId)) {
            throw new BusinessException("只能出售自己订单中的赏品");
        }
        var line = order.items().stream()
                .filter(item -> item.id().equals(orderItemId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("订单项不存在"));
        ProductView product = line.products().stream()
                .filter(p -> productId.equals(p.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("该订单中未找到对应赏品"));

        Integer existing = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM marketplace_listing
                        WHERE seller_user_id = ? AND mystery_box_order_id = ? AND product_id = ?
                          AND status = 'ON_SALE'
                        """,
                Integer.class,
                sellerUserId,
                orderId,
                productId
        );
        if (existing != null && existing > 0) {
            throw new BusinessException("该赏品已在集市挂牌中");
        }

        String id = IdUtil.fastSimpleUUID();
        jdbcTemplate.update(
                """
                        INSERT INTO marketplace_listing (
                            id, seller_user_id, mystery_box_order_id, mystery_box_order_item_id,
                            product_id, product_name, cover, quality_type, price, status, created_time, edited_time
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ON_SALE', ?, ?)
                        """,
                id,
                sellerUserId,
                orderId,
                orderItemId,
                productId,
                product.getName(),
                product.getCover(),
                product.getQualityType() == null ? null : product.getQualityType().getKeyEnName(),
                price,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        return id;
    }

    @Transactional
    public void buyListing(String buyerUserId, String listingId) {
        Map<String, Object> row = jdbcTemplate.queryForMap(
                """
                        SELECT id, seller_user_id, mystery_box_order_id, mystery_box_order_item_id,
                               product_id, product_name, price, status
                        FROM marketplace_listing
                        WHERE id = ?
                        """,
                listingId
        );
        if (!"ON_SALE".equals(row.get("status"))) {
            throw new BusinessException("该挂牌已下架或已售出");
        }
        String sellerUserId = (String) row.get("seller_user_id");
        if (sellerUserId.equals(buyerUserId)) {
            throw new BusinessException("不能购买自己的挂牌");
        }
        BigDecimal price = (BigDecimal) row.get("price");
        String productName = (String) row.get("product_name");
        String orderItemId = (String) row.get("mystery_box_order_item_id");
        String productId = (String) row.get("product_id");

        BigDecimal feeRate = marketplaceFeeRate == null ? BigDecimal.ZERO : marketplaceFeeRate;
        if (feeRate.compareTo(BigDecimal.ZERO) < 0 || feeRate.compareTo(BigDecimal.ONE) >= 0) {
            feeRate = new BigDecimal("0.05");
        }
        BigDecimal fee = price.multiply(feeRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal sellerProceeds = price.subtract(fee).max(BigDecimal.ZERO);
        userWalletService.transfer(
                buyerUserId,
                sellerUserId,
                sellerProceeds,
                "MARKETPLACE",
                "集市交易：" + productName + "（平台服务费 ¥" + fee + "）",
                listingId
        );

        removeProductFromSellerOrderItem(orderItemId, productId);

        jdbcTemplate.update(
                """
                        UPDATE marketplace_listing
                        SET status = 'SOLD', buyer_user_id = ?, sold_time = ?, edited_time = ?,
                            buyer_ship_status = 'PENDING_SHIP'
                        WHERE id = ? AND status = 'ON_SALE'
                        """,
                buyerUserId,
                LocalDateTime.now(),
                LocalDateTime.now(),
                listingId
        );

        userNotificationService.push(
                buyerUserId,
                "MARKETPLACE",
                "集市购买成功",
                "您已购入「" + productName + "」，可在仓库查看",
                listingId
        );
        userNotificationService.push(
                sellerUserId,
                "MARKETPLACE",
                "赏品已售出",
                "「" + productName + "」已售出，款项已入账余额",
                listingId
        );
    }

    private void removeProductFromSellerOrderItem(String orderItemId, String productId) {
        if (orderItemId == null || orderItemId.isBlank()) {
            return;
        }
        MysteryBoxOrderItem item = mysteryBoxOrderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new BusinessException("订单项不存在"));
        List<ProductView> products = new ArrayList<>(item.products());
        boolean removed = products.removeIf(p -> productId.equals(p.getId()));
        if (!removed) {
            throw new BusinessException("卖家订单中已无该赏品");
        }
        mysteryBoxOrderItemRepository.updateProducts(orderItemId, products);
    }

    @Transactional
    public void cancelListing(String sellerUserId, String listingId) {
        int updated = jdbcTemplate.update(
                """
                        UPDATE marketplace_listing
                        SET status = 'CANCELLED', edited_time = ?
                        WHERE id = ? AND seller_user_id = ? AND status = 'ON_SALE'
                        """,
                LocalDateTime.now(),
                listingId,
                sellerUserId
        );
        if (updated == 0) {
            throw new BusinessException("挂牌不存在或无法取消");
        }
    }

    public record MarketplaceListingView(
            String id,
            String sellerUserId,
            String orderId,
            String orderItemId,
            String productId,
            String productName,
            String cover,
            String qualityType,
            BigDecimal price,
            String status,
            LocalDateTime createdTime
    ) {
    }

    public record PurchasedListingView(
            String id,
            String productName,
            String cover,
            String qualityType,
            BigDecimal price,
            String buyerShipStatus,
            LocalDateTime soldTime
    ) {
    }
}
