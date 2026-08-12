package io.github.qifan777.server.marketplace;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.infrastructure.money.MoneyRounding;
import io.github.qifan777.server.marketplace.payout.MarketplacePayoutGatewayRegistry;
import io.github.qifan777.server.marketplace.metrics.MarketplacePayoutMetrics;
import io.github.qifan777.server.marketplace.payout.MarketplacePayoutOutcome;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketplaceService {
    public static final BigDecimal MIN_CREDIT_SCORE = new BigDecimal("3.0");
    public static final int COOLING_HOURS = 24;

    @Value("${app.marketplace.fee-rate:0.05}")
    private BigDecimal marketplaceFeeRate;

    @Value("${app.marketplace.external-payout-timeout-hours:24}")
    private int externalPayoutTimeoutHours;


    private final JdbcTemplate jdbcTemplate;
    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    private final UserWalletService userWalletService;
    private final UserNotificationService userNotificationService;
    private final MarketplacePayoutGatewayRegistry marketplacePayoutGatewayRegistry;
    private final MarketplacePayoutMetrics marketplacePayoutMetrics;
    private final ProductRepository productRepository;
    private final MarketProperties marketProperties;

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
                    rs.getTimestamp("created_time").toLocalDateTime(),
                    rs.getTimestamp("cooling_until") == null ? null : rs.getTimestamp("cooling_until").toLocalDateTime(),
                    rs.getString("trade_id"),
                    rs.getBigDecimal("seller_credit"),
                    rs.getString("trade_status")
            );

    public List<MarketplaceListingView> listOnSale(int limit, int offset, String keyword, String sort, BigDecimal minPrice, BigDecimal maxPrice) {
        int size = Math.min(Math.max(limit, 1), 50);
        int off = Math.max(offset, 0);
        String orderBy = resolveSort(sort);
        StringBuilder sql = new StringBuilder("""
                SELECT ml.id, ml.seller_user_id, ml.mystery_box_order_id, ml.mystery_box_order_item_id,
                       ml.product_id, ml.product_name, ml.cover, ml.quality_type, ml.price, ml.status,
                       ml.created_time, ml.cooling_until, ml.trade_id,
                       COALESCE(c.score, 5.00) AS seller_credit,
                       NULL AS trade_status
                FROM marketplace_listing ml
                LEFT JOIN user_market_credit c ON c.user_id = ml.seller_user_id
                WHERE ml.status = 'ON_SALE'
                """);
        List<Object> args = new ArrayList<>();
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (ml.product_name LIKE ? OR ml.quality_type LIKE ?)");
            String like = "%" + keyword.trim() + "%";
            args.add(like);
            args.add(like);
        }
        if (minPrice != null) {
            sql.append(" AND ml.price >= ?");
            args.add(minPrice);
        }
        if (maxPrice != null) {
            sql.append(" AND ml.price <= ?");
            args.add(maxPrice);
        }
        sql.append(" ORDER BY ").append(orderBy.replace("price", "ml.price").replace("created_time", "ml.created_time"))
                .append(" LIMIT ? OFFSET ?");
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
                        SELECT ml.id, ml.product_name, ml.cover, ml.quality_type, ml.price, ml.buyer_ship_status,
                               ml.sold_time, ml.status, ml.cooling_until, ml.trade_id,
                               COALESCE(c.score, 5.00) AS seller_credit,
                               mt.status AS trade_status
                        FROM marketplace_listing ml
                        LEFT JOIN user_market_credit c ON c.user_id = ml.seller_user_id
                        LEFT JOIN marketplace_trade mt ON mt.id = ml.trade_id
                        WHERE ml.buyer_user_id = ? AND ml.status IN ('SOLD', 'COOLING')
                        ORDER BY COALESCE(ml.sold_time, ml.edited_time) DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new PurchasedListingView(
                        rs.getString("id"),
                        rs.getString("product_name"),
                        rs.getString("cover"),
                        rs.getString("quality_type"),
                        rs.getBigDecimal("price"),
                        rs.getString("buyer_ship_status"),
                        rs.getTimestamp("sold_time") == null ? null : rs.getTimestamp("sold_time").toLocalDateTime(),
                        rs.getString("status"),
                        rs.getTimestamp("cooling_until") == null ? null : rs.getTimestamp("cooling_until").toLocalDateTime(),
                        rs.getString("trade_id"),
                        rs.getBigDecimal("seller_credit"),
                        rs.getString("trade_status")
                ),
                buyerUserId,
                size
        );
    }

    public List<MarketplaceListingView> listBySeller(String sellerUserId, int limit) {
        int size = Math.min(Math.max(limit, 1), 50);
        return jdbcTemplate.query(
                """
                        SELECT ml.id, ml.seller_user_id, ml.mystery_box_order_id, ml.mystery_box_order_item_id,
                               ml.product_id, ml.product_name, ml.cover, ml.quality_type, ml.price, ml.status,
                               ml.created_time, ml.cooling_until, ml.trade_id,
                               COALESCE(c.score, 5.00) AS seller_credit,
                               mt.status AS trade_status
                        FROM marketplace_listing ml
                        LEFT JOIN user_market_credit c ON c.user_id = ml.seller_user_id
                        LEFT JOIN marketplace_trade mt ON mt.id = ml.trade_id
                        WHERE ml.seller_user_id = ?
                        ORDER BY ml.created_time DESC
                        LIMIT ?
                        """,
                LISTING_ROW_MAPPER,
                sellerUserId,
                size
        );
    }

    public BigDecimal getCreditScore(String userId) {
        ensureCreditRow(userId);
        BigDecimal score = jdbcTemplate.queryForObject(
                "SELECT score FROM user_market_credit WHERE user_id = ?",
                BigDecimal.class,
                userId
        );
        return score == null ? new BigDecimal("5.00") : score;
    }

    private void ensureCreditRow(String userId) {
        jdbcTemplate.update(
                """
                        INSERT IGNORE INTO user_market_credit (user_id, score, trade_count, created_time, edited_time)
                        VALUES (?, 5.00, 0, ?, ?)
                        """,
                userId,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    private void assertCreditAllowsTrade(String userId) {
        BigDecimal score = getCreditScore(userId);
        if (score.compareTo(MIN_CREDIT_SCORE) < 0) {
            throw new BusinessException("MARKETPLACE_CREDIT_LOW: 信用分低于 " + MIN_CREDIT_SCORE + "，暂不可挂牌或购买");
        }
    }

    @Transactional
    public String createListing(
            String sellerUserId,
            String orderId,
            String orderItemId,
            String productId,
            BigDecimal price
    ) {
        assertCreditAllowsTrade(sellerUserId);
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("MARKETPLACE_INVALID_PRICE: 挂牌价格须大于 0");
        }
        BigDecimal minPrice = marketProperties.isVndMarket() ? BigDecimal.ONE : new BigDecimal("0.01");
        if (price.compareTo(minPrice) < 0) {
            throw new BusinessException(
                    "MARKETPLACE_INVALID_PRICE: 挂牌价格不能低于 " + marketProperties.formatAmount(minPrice));
        }
        BigDecimal rounded = MoneyRounding.round(price, requireCurrency());
        if (rounded == null || rounded.compareTo(minPrice) < 0) {
            throw new BusinessException("MARKETPLACE_INVALID_PRICE: 挂牌价格须大于 0");
        }
        price = rounded;
        MysteryBoxOrder order = mysteryBoxOrderRepository.findByIdForFront(orderId);
        if (!order.creator().id().equals(sellerUserId)) {
            throw new BusinessException("MARKETPLACE_UNAUTHORIZED: 只能出售自己订单中的赏品");
        }
        var line = order.items().stream()
                .filter(item -> item.id().equals(orderItemId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("MARKETPLACE_ORDER_ITEM_NOT_FOUND: 订单项不存在"));
        ProductView product = line.products().stream()
                .filter(p -> productId.equals(p.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("MARKETPLACE_PRODUCT_NOT_FOUND: 该订单中未找到对应赏品"));

        Integer existing = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM marketplace_listing
                        WHERE seller_user_id = ? AND mystery_box_order_id = ? AND product_id = ?
                          AND status IN ('ON_SALE', 'COOLING')
                        """,
                Integer.class,
                sellerUserId,
                orderId,
                productId
        );
        if (existing != null && existing > 0) {
            throw new BusinessException("MARKETPLACE_ALREADY_LISTED: 该赏品已在集市挂牌中");
        }

        // Lock inventory immediately so redeem/ship cannot double-spend while listed.
        removeProductFromSellerOrderItem(orderItemId, productId, false);

        String id = IdUtil.fastSimpleUUID();
        try {
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
        } catch (DuplicateKeyException dup) {
            restoreProductToSellerOrderItem(orderItemId, productId);
            throw new BusinessException("MARKETPLACE_ALREADY_LISTED: 该赏品已在集市挂牌中");
        } catch (RuntimeException ex) {
            restoreProductToSellerOrderItem(orderItemId, productId);
            throw ex;
        }
        return id;
    }

    @Transactional
    public String buyListing(String buyerUserId, String listingId) {
        marketplacePayoutGatewayRegistry.resolveConfiguredReady();
        assertCreditAllowsTrade(buyerUserId);
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
            throw new BusinessException("MARKETPLACE_LISTING_UNAVAILABLE: 该挂牌已下架或已售出");
        }
        String sellerUserId = (String) row.get("seller_user_id");
        if (sellerUserId.equals(buyerUserId)) {
            throw new BusinessException("MARKETPLACE_UNAUTHORIZED: 不能购买自己的挂牌");
        }
        assertCreditAllowsTrade(sellerUserId);

        BigDecimal price = (BigDecimal) row.get("price");
        String productName = (String) row.get("product_name");
        FeeBreakdown fee = computeFee(price);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime coolingUntil = now.plusHours(COOLING_HOURS);
        String tradeId = IdUtil.fastSimpleUUID();

        // Hold full price from buyer until cooling ends or cancel
        try {
            userWalletService.deduct(
                    buyerUserId,
                    price,
                    "MARKETPLACE_HOLD",
                    "集市冷却期锁定：" + productName,
                    tradeId
            );
        } catch (BusinessException ex) {
            String msg = ex.getMessage() == null ? "" : ex.getMessage();
            if (msg.contains("余额不足") || msg.contains("INSUFFICIENT")) {
                throw new BusinessException("MARKETPLACE_INSUFFICIENT_BALANCE: 余额不足");
            }
            throw ex;
        }

        jdbcTemplate.update(
                """
                        INSERT INTO marketplace_trade (
                            id, listing_id, seller_id, buyer_id, price, fee, seller_proceeds,
                            status, cooling_until, created_time, edited_time
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_COOLING', ?, ?, ?)
                        """,
                tradeId,
                listingId,
                sellerUserId,
                buyerUserId,
                price,
                fee.fee(),
                fee.sellerProceeds(),
                coolingUntil,
                now,
                now
        );

        int updated = jdbcTemplate.update(
                """
                        UPDATE marketplace_listing
                        SET status = 'COOLING', buyer_user_id = ?, cooling_until = ?, trade_id = ?, edited_time = ?
                        WHERE id = ? AND status = 'ON_SALE'
                        """,
                buyerUserId,
                coolingUntil,
                tradeId,
                now,
                listingId
        );
        if (updated == 0) {
            throw new BusinessException("MARKETPLACE_LISTING_UNAVAILABLE: 挂牌状态已变更，请重试");
        }

        userNotificationService.push(
                buyerUserId,
                "MARKETPLACE",
                "集市购买进入冷却期",
                "「" + productName + "」冷却 24 小时后结算，期间可取消",
                listingId
        );
        userNotificationService.push(
                sellerUserId,
                "MARKETPLACE",
                "赏品进入冷却期",
                "「" + productName + "」已被拍下，冷却结束后款项入账",
                listingId
        );
        return tradeId;
    }

    @Transactional
    public void cancelTradeByBuyer(String buyerUserId, String listingId) {
        Map<String, Object> trade = findPendingTrade(listingId);
        if (!buyerUserId.equals(trade.get("buyer_id"))) {
            throw new BusinessException("MARKETPLACE_UNAUTHORIZED: 只能取消自己的冷却期交易");
        }
        String tradeId = (String) trade.get("id");
        String sellerUserId = (String) trade.get("seller_id");
        BigDecimal price = (BigDecimal) trade.get("price");
        String productName = resolveProductName(listingId);

        int cancelled = jdbcTemplate.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'CANCELLED', edited_time = ?
                        WHERE id = ? AND status = 'PENDING_COOLING'
                        """,
                LocalDateTime.now(),
                tradeId
        );
        if (cancelled == 0) {
            throw new BusinessException("MARKETPLACE_COOLING: 交易已结算或已取消");
        }

        userWalletService.credit(
                buyerUserId,
                price,
                "MARKETPLACE_HOLD_REFUND",
                "集市冷却期取消退款：" + productName,
                tradeId
        );

        jdbcTemplate.update(
                """
                        UPDATE marketplace_listing
                        SET status = 'ON_SALE', buyer_user_id = NULL, cooling_until = NULL, trade_id = NULL, edited_time = ?
                        WHERE id = ? AND status = 'COOLING'
                        """,
                LocalDateTime.now(),
                listingId
        );

        userNotificationService.push(
                buyerUserId,
                "MARKETPLACE",
                "冷却期交易已取消",
                "「" + productName + "」已退款",
                listingId
        );
        userNotificationService.push(
                sellerUserId,
                "MARKETPLACE",
                "冷却期交易已取消",
                "「" + productName + "」买家已取消，挂牌已恢复在售",
                listingId
        );
    }

    public List<String> listExpiredCoolingTradeIds(int batchSize) {
        int size = Math.min(Math.max(batchSize, 1), 100);
        return jdbcTemplate.query(
                """
                        SELECT id FROM marketplace_trade
                        WHERE status = 'PENDING_COOLING' AND cooling_until <= ?
                        ORDER BY cooling_until ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> rs.getString("id"),
                LocalDateTime.now(),
                size
        );
    }

    @Transactional
    public void settleTrade(String tradeId) {
        Map<String, Object> trade = jdbcTemplate.queryForMap(
                """
                        SELECT id, listing_id, seller_id, buyer_id, price, fee, seller_proceeds, status
                        FROM marketplace_trade WHERE id = ?
                        """,
                tradeId
        );
        if (!"PENDING_COOLING".equals(trade.get("status"))) {
            return;
        }
        String listingId = (String) trade.get("listing_id");
        String sellerUserId = (String) trade.get("seller_id");
        String buyerUserId = (String) trade.get("buyer_id");
        BigDecimal fee = (BigDecimal) trade.get("fee");
        BigDecimal sellerProceeds = (BigDecimal) trade.get("seller_proceeds");

        Map<String, Object> listing = jdbcTemplate.queryForMap(
                """
                        SELECT mystery_box_order_item_id, product_id, product_name, status
                        FROM marketplace_listing WHERE id = ?
                        """,
                listingId
        );
        if (!"COOLING".equals(listing.get("status"))) {
            throw new BusinessException("MARKETPLACE_COOLING: 挂牌状态异常，无法结算");
        }
        String productName = (String) listing.get("product_name");
        String orderItemId = (String) listing.get("mystery_box_order_item_id");
        String productId = (String) listing.get("product_id");

        LocalDateTime now = LocalDateTime.now();
        // Claim before payout so cancelTradeByBuyer cannot refund the same hold.
        int claimed = jdbcTemplate.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'SETTLING', edited_time = ?
                        WHERE id = ? AND status = 'PENDING_COOLING'
                        """,
                now,
                tradeId
        );
        if (claimed == 0) {
            return;
        }

        MarketplacePayoutOutcome payoutOutcome;
        try {
            payoutOutcome = marketplacePayoutGatewayRegistry.resolveConfiguredReady().settleTrade(
                    buyerUserId,
                    sellerUserId,
                    sellerProceeds,
                    fee,
                    productName,
                    tradeId
            );
            removeProductFromSellerOrderItem(orderItemId, productId, true);
        } catch (RuntimeException ex) {
            jdbcTemplate.update(
                    """
                            UPDATE marketplace_trade
                            SET status = 'PENDING_COOLING', edited_time = ?
                            WHERE id = ? AND status = 'SETTLING'
                            """,
                    LocalDateTime.now(),
                    tradeId
            );
            throw ex;
        }

        String tradeStatus = payoutOutcome == MarketplacePayoutOutcome.PENDING_EXTERNAL
                ? "PENDING_EXTERNAL"
                : "COMPLETED";
        int finalized = jdbcTemplate.update(
                """
                        UPDATE marketplace_trade
                        SET status = ?, edited_time = ?
                        WHERE id = ? AND status = 'SETTLING'
                        """,
                tradeStatus,
                now,
                tradeId
        );
        if (finalized == 0) {
            log.warn("Marketplace settle race after SETTLING tradeId={}", tradeId);
            return;
        }
        jdbcTemplate.update(
                """
                        UPDATE marketplace_listing
                        SET status = 'SOLD', sold_time = ?, cooling_until = NULL, edited_time = ?,
                            buyer_ship_status = 'PENDING_SHIP'
                        WHERE id = ? AND status = 'COOLING'
                        """,
                now,
                now,
                listingId
        );

        ensureCreditRow(buyerUserId);
        ensureCreditRow(sellerUserId);
        jdbcTemplate.update(
                "UPDATE user_market_credit SET trade_count = trade_count + 1, edited_time = ? WHERE user_id = ?",
                now,
                buyerUserId
        );
        jdbcTemplate.update(
                "UPDATE user_market_credit SET trade_count = trade_count + 1, edited_time = ? WHERE user_id = ?",
                now,
                sellerUserId
        );

        userNotificationService.push(
                buyerUserId,
                "MARKETPLACE",
                "集市购买成功",
                "「" + productName + "」冷却结束，可在仓库查看",
                listingId
        );
        if (payoutOutcome == MarketplacePayoutOutcome.PENDING_EXTERNAL) {
            marketplacePayoutMetrics.pendingExternalCreated();
            logPendingExternal(tradeId, listingId);
            userNotificationService.push(
                    sellerUserId,
                    "MARKETPLACE",
                    "赏品已售出",
                    "「" + productName + "」已成交，外部打款处理中，请稍候到账",
                    listingId
            );
        } else {
            userNotificationService.push(
                    sellerUserId,
                    "MARKETPLACE",
                    "赏品已售出",
                    "「" + productName + "」已结算，款项已入账余额",
                    listingId
            );
        }
    }

    @Transactional
    public void rateTrade(String raterUserId, String tradeId, BigDecimal score) {
        if (score == null || score.compareTo(BigDecimal.ONE) < 0 || score.compareTo(new BigDecimal("5")) > 0) {
            throw new BusinessException("MARKETPLACE_INVALID_RATING: 评分须在 1~5 之间");
        }
        Map<String, Object> trade = jdbcTemplate.queryForMap(
                """
                        SELECT id, seller_id, buyer_id, status, buyer_rated, seller_rated
                        FROM marketplace_trade WHERE id = ?
                        """,
                tradeId
        );
        if (!"COMPLETED".equals(trade.get("status"))) {
            throw new BusinessException("MARKETPLACE_RATING_NOT_ALLOWED: 仅已完成交易可评分");
        }
        String sellerId = (String) trade.get("seller_id");
        String buyerId = (String) trade.get("buyer_id");
        boolean asBuyer = raterUserId.equals(buyerId);
        boolean asSeller = raterUserId.equals(sellerId);
        if (!asBuyer && !asSeller) {
            throw new BusinessException("MARKETPLACE_UNAUTHORIZED: 只能评价自己参与的交易");
        }
        Number buyerRated = (Number) trade.get("buyer_rated");
        Number sellerRated = (Number) trade.get("seller_rated");
        LocalDateTime now = LocalDateTime.now();
        if (asBuyer) {
            int claimed = jdbcTemplate.update(
                    """
                            UPDATE marketplace_trade
                            SET buyer_rated = 1, buyer_credit_score = ?, edited_time = ?
                            WHERE id = ? AND buyer_rated = 0
                            """,
                    score,
                    now,
                    tradeId
            );
            if (claimed == 0) {
                throw new BusinessException("MARKETPLACE_ALREADY_RATED: 已评价过该交易");
            }
            applyRating(sellerId, score);
        } else {
            int claimed = jdbcTemplate.update(
                    """
                            UPDATE marketplace_trade
                            SET seller_rated = 1, seller_credit_score = ?, edited_time = ?
                            WHERE id = ? AND seller_rated = 0
                            """,
                    score,
                    now,
                    tradeId
            );
            if (claimed == 0) {
                throw new BusinessException("MARKETPLACE_ALREADY_RATED: 已评价过该交易");
            }
            applyRating(buyerId, score);
        }
    }

    private void applyRating(String targetUserId, BigDecimal newScore) {
        ensureCreditRow(targetUserId);
        // Exponential moving average toward the new rating
        jdbcTemplate.update(
                """
                        UPDATE user_market_credit
                        SET score = LEAST(5.00, GREATEST(1.00, ROUND((score * 0.8) + (? * 0.2), 2))),
                            edited_time = ?
                        WHERE user_id = ?
                        """,
                newScore,
                LocalDateTime.now(),
                targetUserId
        );
    }

    @Transactional
    public String submitCertificate(String sellerUserId, String listingId, String videoUrl, String productUniqueId, String ipLicenseText) {
        Map<String, Object> listing = jdbcTemplate.queryForMap(
                "SELECT seller_user_id, product_id FROM marketplace_listing WHERE id = ?",
                listingId
        );
        if (!sellerUserId.equals(listing.get("seller_user_id"))) {
            throw new BusinessException("MARKETPLACE_UNAUTHORIZED: 只能为自己的挂牌提交证书");
        }
        if (videoUrl == null || videoUrl.isBlank()) {
            throw new BusinessException("MARKETPLACE_CERTIFICATE_REQUIRED: 请提交视频链接");
        }
        String id = IdUtil.fastSimpleUUID();
        jdbcTemplate.update(
                """
                        INSERT INTO marketplace_certificate (
                            id, listing_id, product_unique_id, ip_license_text, trade_history_json,
                            video_url, review_status, created_time
                        ) VALUES (?, ?, ?, ?, '[]', ?, 'PENDING_REVIEW', ?)
                        """,
                id,
                listingId,
                productUniqueId,
                ipLicenseText,
                videoUrl.trim(),
                LocalDateTime.now()
        );
        return id;
    }

    @Transactional
    public void approveCertificate(String certificateId) {
        int updated = jdbcTemplate.update(
                """
                        UPDATE marketplace_certificate
                        SET review_status = 'APPROVED'
                        WHERE id = ? AND review_status = 'PENDING_REVIEW'
                        """,
                certificateId
        );
        if (updated != 1) {
            throw new BusinessException("MARKETPLACE_CERTIFICATE_STATE: 证书不存在或已审核");
        }
    }

    @Transactional
    public void rejectCertificate(String certificateId) {
        int updated = jdbcTemplate.update(
                """
                        UPDATE marketplace_certificate
                        SET review_status = 'REJECTED'
                        WHERE id = ? AND review_status = 'PENDING_REVIEW'
                        """,
                certificateId
        );
        if (updated != 1) {
            throw new BusinessException("MARKETPLACE_CERTIFICATE_STATE: 证书不存在或已审核");
        }
    }

    public CertificateView getCertificate(String listingId) {
        List<CertificateView> rows = jdbcTemplate.query(
                """
                        SELECT id, listing_id, product_unique_id, ip_license_text, trade_history_json,
                               video_url, review_status, created_time
                        FROM marketplace_certificate
                        WHERE listing_id = ?
                        ORDER BY created_time DESC
                        LIMIT 1
                        """,
                (rs, rowNum) -> new CertificateView(
                        rs.getString("id"),
                        rs.getString("listing_id"),
                        rs.getString("product_unique_id"),
                        rs.getString("ip_license_text"),
                        rs.getString("trade_history_json"),
                        rs.getString("video_url"),
                        rs.getString("review_status"),
                        rs.getTimestamp("created_time").toLocalDateTime()
                ),
                listingId
        );
        if (rows.isEmpty()) {
            throw new BusinessException("MARKETPLACE_CERTIFICATE_MISSING: 暂无证书");
        }
        return rows.get(0);
    }

    private Map<String, Object> findPendingTrade(String listingId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                        SELECT id, listing_id, seller_id, buyer_id, price, fee, seller_proceeds, status, cooling_until
                        FROM marketplace_trade
                        WHERE listing_id = ? AND status = 'PENDING_COOLING'
                        ORDER BY created_time DESC
                        LIMIT 1
                        """,
                listingId
        );
        if (rows.isEmpty()) {
            throw new BusinessException("MARKETPLACE_COOLING: 无进行中的冷却期交易");
        }
        return rows.get(0);
    }

    private String resolveProductName(String listingId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT product_name FROM marketplace_listing WHERE id = ?",
                    String.class,
                    listingId
            );
        } catch (Exception e) {
            return "赏品";
        }
    }

    private FeeBreakdown computeFee(BigDecimal price) {
        BigDecimal feeRate = marketplaceFeeRate == null ? BigDecimal.ZERO : marketplaceFeeRate;
        if (feeRate.compareTo(BigDecimal.ZERO) < 0 || feeRate.compareTo(BigDecimal.ONE) >= 0) {
            feeRate = new BigDecimal("0.05");
        }
        String currency = requireCurrency();
        BigDecimal fee = MoneyRounding.round(price.multiply(feeRate), currency);
        BigDecimal sellerProceeds = MoneyRounding.round(price.subtract(fee).max(BigDecimal.ZERO), currency);
        return new FeeBreakdown(fee, sellerProceeds);
    }

    private String requireCurrency() {
        if (marketProperties == null || !StringUtils.hasText(marketProperties.getCurrency())) {
            throw new IllegalStateException("MARKET_CURRENCY_MISSING: marketProperties.currency is required");
        }
        return marketProperties.getCurrency().trim();
    }

    private void removeProductFromSellerOrderItem(String orderItemId, String productId) {
        removeProductFromSellerOrderItem(orderItemId, productId, false);
    }

    /**
     * @param softIfMissing when true (settle after list-lock), missing product is OK
     */
    private void removeProductFromSellerOrderItem(String orderItemId, String productId, boolean softIfMissing) {
        if (orderItemId == null || orderItemId.isBlank()) {
            return;
        }
        MysteryBoxOrderItem item = mysteryBoxOrderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new BusinessException("MARKETPLACE_ORDER_ITEM_NOT_FOUND: 订单项不存在"));
        List<ProductView> products = item.products() == null ? new ArrayList<>() : new ArrayList<>(item.products());
        boolean removed = products.removeIf(p -> productId.equals(p.getId()));
        if (!removed) {
            if (softIfMissing) {
                return;
            }
            throw new BusinessException("MARKETPLACE_SELLER_ITEM_GONE: 卖家订单中已无该赏品");
        }
        mysteryBoxOrderItemRepository.updateProducts(orderItemId, products);
    }


    public List<PendingExternalTradeView> listPendingExternalTrades(int limit) {
        int size = Math.min(Math.max(limit, 1), 100);
        return jdbcTemplate.query(
                """
                        SELECT t.id, t.listing_id, t.seller_id, t.buyer_id, t.price, t.fee, t.seller_proceeds,
                               t.status, t.edited_time, ml.product_name
                        FROM marketplace_trade t
                        LEFT JOIN marketplace_listing ml ON ml.id = t.listing_id
                        WHERE t.status = 'PENDING_EXTERNAL'
                        ORDER BY t.edited_time ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new PendingExternalTradeView(
                        rs.getString("id"),
                        rs.getString("listing_id"),
                        rs.getString("seller_id"),
                        rs.getString("buyer_id"),
                        rs.getBigDecimal("price"),
                        rs.getBigDecimal("fee"),
                        rs.getBigDecimal("seller_proceeds"),
                        rs.getString("status"),
                        rs.getTimestamp("edited_time").toLocalDateTime(),
                        rs.getString("product_name")
                ),
                size
        );
    }

    public List<String> listAgedPendingExternalTradeIds(int batchSize) {
        int size = Math.min(Math.max(batchSize, 1), 100);
        int hours = Math.max(externalPayoutTimeoutHours, 1);
        return jdbcTemplate.query(
                """
                        SELECT id FROM marketplace_trade
                        WHERE status = 'PENDING_EXTERNAL'
                          AND edited_time <= DATE_SUB(NOW(), INTERVAL ? HOUR)
                        ORDER BY edited_time ASC
                        LIMIT ?
                        """,
                (rs, rowNum) -> rs.getString("id"),
                hours,
                size
        );
    }

    /**
     * Admin: confirm external disbursement succeeded; finalize PENDING_EXTERNAL trade.
     *
     * @param externalTxnId required proof id from the payout provider
     */
    @Transactional
    public void completeExternalPayout(String tradeId, String externalTxnId) {
        if (!StringUtils.hasText(externalTxnId)) {
            throw new BusinessException("MARKETPLACE_EXTERNAL_TXN_REQUIRED: 请填写外部打款流水号");
        }
        Map<String, Object> trade = loadTrade(tradeId);
        if (!"PENDING_EXTERNAL".equals(trade.get("status"))) {
            throw new BusinessException("MARKETPLACE_EXTERNAL_STATE: 仅 PENDING_EXTERNAL 交易可确认外部打款完成");
        }
        String listingId = (String) trade.get("listing_id");
        String sellerUserId = (String) trade.get("seller_id");
        String buyerUserId = (String) trade.get("buyer_id");
        String productName = resolveProductName(listingId);
        LocalDateTime now = LocalDateTime.now();
        int updated = jdbcTemplate.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'COMPLETED', edited_time = ?, external_txn_id = ?
                        WHERE id = ? AND status = 'PENDING_EXTERNAL'
                        """,
                now,
                externalTxnId.trim(),
                tradeId
        );
        if (updated == 0) {
            throw new BusinessException("MARKETPLACE_STATE_CHANGED: 交易状态已变更，请重试");
        }
        marketplacePayoutMetrics.pendingExternalCompleted();
        userNotificationService.push(
                sellerUserId,
                "MARKETPLACE",
                "外部打款已完成",
                "「" + productName + "」外部打款已确认到账",
                listingId
        );
        userNotificationService.push(
                buyerUserId,
                "MARKETPLACE",
                "集市交易已完成",
                "「" + productName + "」交易已完成",
                listingId
        );
    }

    /**
     * Admin / watch job: fail PENDING_EXTERNAL — refund buyer hold and restore listing + seller inventory.
     */
    @Transactional
    public void failExternalPayout(String tradeId) {
        failExternalPayout(tradeId, false);
    }

    @Transactional
    public void failExternalPayout(String tradeId, boolean agedAutoFail) {
        Map<String, Object> trade = loadTrade(tradeId);
        if (!"PENDING_EXTERNAL".equals(trade.get("status"))) {
            throw new BusinessException("MARKETPLACE_EXTERNAL_STATE: 仅 PENDING_EXTERNAL 交易可失败退款");
        }
        String listingId = (String) trade.get("listing_id");
        String sellerUserId = (String) trade.get("seller_id");
        String buyerUserId = (String) trade.get("buyer_id");
        BigDecimal price = (BigDecimal) trade.get("price");

        Map<String, Object> listing = jdbcTemplate.queryForMap(
                """
                        SELECT mystery_box_order_item_id, product_id, product_name, status
                        FROM marketplace_listing WHERE id = ?
                        """,
                listingId
        );
        String productName = (String) listing.get("product_name");
        String orderItemId = (String) listing.get("mystery_box_order_item_id");
        String productId = (String) listing.get("product_id");

        LocalDateTime now = LocalDateTime.now();
        int updated = jdbcTemplate.update(
                """
                        UPDATE marketplace_trade
                        SET status = 'FAILED_EXTERNAL', edited_time = ?
                        WHERE id = ? AND status = 'PENDING_EXTERNAL'
                        """,
                now,
                tradeId
        );
        if (updated == 0) {
            throw new BusinessException("MARKETPLACE_STATE_CHANGED: 交易状态已变更，请重试");
        }

        userWalletService.credit(
                buyerUserId,
                price,
                "MARKETPLACE_HOLD_REFUND",
                "集市外部打款失败退款：" + productName,
                tradeId
        );

        jdbcTemplate.update(
                """
                        UPDATE marketplace_listing
                        SET status = 'ON_SALE', buyer_user_id = NULL, cooling_until = NULL, trade_id = NULL,
                            sold_time = NULL, buyer_ship_status = NULL, edited_time = ?
                        WHERE id = ?
                        """,
                now,
                listingId
        );

        restoreProductToSellerOrderItem(orderItemId, productId);

        // Reverse credit increments applied at settle
        jdbcTemplate.update(
                "UPDATE user_market_credit SET trade_count = GREATEST(0, trade_count - 1), edited_time = ? WHERE user_id = ?",
                now,
                buyerUserId
        );
        jdbcTemplate.update(
                "UPDATE user_market_credit SET trade_count = GREATEST(0, trade_count - 1), edited_time = ? WHERE user_id = ?",
                now,
                sellerUserId
        );

        marketplacePayoutMetrics.pendingExternalFailed();
        if (agedAutoFail) {
            marketplacePayoutMetrics.pendingExternalAgedFailed();
            log.warn(
                    "marketplace PENDING_EXTERNAL aged fail: tradeId={}, listingId={}, timeoutHours={}",
                    tradeId,
                    listingId,
                    externalPayoutTimeoutHours
            );
        }

        userNotificationService.push(
                buyerUserId,
                "MARKETPLACE",
                "集市交易已退款",
                "「" + productName + "」外部打款失败，已退回锁定金额，挂牌已恢复",
                listingId
        );
        userNotificationService.push(
                sellerUserId,
                "MARKETPLACE",
                "集市交易已取消",
                "「" + productName + "」外部打款失败，挂牌已恢复在售",
                listingId
        );
    }

    private Map<String, Object> loadTrade(String tradeId) {
        return jdbcTemplate.queryForMap(
                """
                        SELECT id, listing_id, seller_id, buyer_id, price, fee, seller_proceeds, status
                        FROM marketplace_trade WHERE id = ?
                        """,
                tradeId
        );
    }

    private void restoreProductToSellerOrderItem(String orderItemId, String productId) {
        if (orderItemId == null || orderItemId.isBlank() || productId == null || productId.isBlank()) {
            return;
        }
        MysteryBoxOrderItem item = mysteryBoxOrderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new BusinessException("订单项不存在，无法恢复赏品"));
        List<ProductView> products = new ArrayList<>(item.products());
        boolean alreadyPresent = products.stream().anyMatch(p -> productId.equals(p.getId()));
        if (alreadyPresent) {
            return;
        }
        ProductView product = productRepository.findById(productId)
                .map(ProductView::new)
                .orElseThrow(() -> new BusinessException("赏品不存在，无法恢复：" + productId));
        products.add(product);
        mysteryBoxOrderItemRepository.updateProducts(orderItemId, products);
    }

    private void logPendingExternal(String tradeId, String listingId) {
        log.info(
                "marketplace PENDING_EXTERNAL created: tradeId={}, listingId={}, gateway={}",
                tradeId,
                listingId,
                marketplacePayoutGatewayRegistry.configuredProvider()
        );
    }

    @Transactional
    public void cancelListing(String sellerUserId, String listingId) {
        Map<String, Object> listing;
        try {
            listing = jdbcTemplate.queryForMap(
                    """
                            SELECT mystery_box_order_item_id, product_id, product_name, cover, quality_type
                            FROM marketplace_listing
                            WHERE id = ? AND seller_user_id = ? AND status = 'ON_SALE'
                            """,
                    listingId,
                    sellerUserId
            );
        } catch (Exception ex) {
            throw new BusinessException("MARKETPLACE_CANCEL_FAILED: 挂牌不存在或无法取消");
        }
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
            throw new BusinessException("MARKETPLACE_CANCEL_FAILED: 挂牌不存在或无法取消");
        }
        String orderItemId = (String) listing.get("mystery_box_order_item_id");
        String productId = (String) listing.get("product_id");
        restoreProductToSellerOrderItem(orderItemId, productId);
    }

    private record FeeBreakdown(BigDecimal fee, BigDecimal sellerProceeds) {
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
            LocalDateTime createdTime,
            LocalDateTime coolingUntil,
            String tradeId,
            BigDecimal sellerCredit,
            String tradeStatus
    ) {
    }

    public record PurchasedListingView(
            String id,
            String productName,
            String cover,
            String qualityType,
            BigDecimal price,
            String buyerShipStatus,
            LocalDateTime soldTime,
            String status,
            LocalDateTime coolingUntil,
            String tradeId,
            BigDecimal sellerCredit,
            String tradeStatus
    ) {
    }

    public record PendingExternalTradeView(
            String id,
            String listingId,
            String sellerId,
            String buyerId,
            BigDecimal price,
            BigDecimal fee,
            BigDecimal sellerProceeds,
            String status,
            LocalDateTime editedTime,
            String productName
    ) {
    }
    public record CertificateView(
            String id,
            String listingId,
            String productUniqueId,
            String ipLicenseText,
            String tradeHistoryJson,
            String videoUrl,
            String reviewStatus,
            LocalDateTime createdTime
    ) {
    }
}
