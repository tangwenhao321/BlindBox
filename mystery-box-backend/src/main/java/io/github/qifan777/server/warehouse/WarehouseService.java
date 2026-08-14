package io.github.qifan777.server.warehouse;

import io.github.qifan777.server.dict.model.ProductOrderStatus;

import io.github.qifan777.server.box.order.entity.MysteryBoxOrder;
import io.github.qifan777.server.box.order.entity.MysteryBoxOrderTable;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.warehouse.metrics.WarehouseMetrics;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseService {

    private static final int MAX_ORDER_SCAN = 500;
    private static final int MAX_MARKETPLACE_SCAN = 500;
    private static final int MAX_COLLECT = MAX_ORDER_SCAN + MAX_MARKETPLACE_SCAN;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_INSTANT;

    private static final Set<ProductOrderStatus> PENDING = Set.of(
            ProductOrderStatus.TO_BE_DELIVERED,
            ProductOrderStatus.TO_BE_RECEIVED
    );

    private static final Set<ProductOrderStatus> ALL_WAREHOUSE = Set.of(
            ProductOrderStatus.TO_BE_DELIVERED,
            ProductOrderStatus.TO_BE_RECEIVED,
            ProductOrderStatus.TO_BE_EVALUATED,
            ProductOrderStatus.FINISHED
    );

    private final MysteryBoxOrderRepository mysteryBoxOrderRepository;
    private final ProductRepository productRepository;
    private final JdbcTemplate jdbcTemplate;
    private final WarehouseMetrics warehouseMetrics;

    private record ScoredItem(WarehouseForFrontController.WarehouseItemView view, long sortEpochMs) {
    }

    public record WarehouseCountResult(int count, boolean approximate) {
    }

    public record WarehouseListResult(
            List<WarehouseForFrontController.WarehouseItemView> items,
            boolean approximate
    ) {
    }

    public WarehouseCountResult countItems(String userId, boolean pendingOnly) {
        try {
            int count = countOrderWarehouseItems(userId, pendingOnly) + countMarketplaceItems(userId, pendingOnly);
            return new WarehouseCountResult(count, false);
        } catch (RuntimeException ex) {
            log.warn("warehouse count SQL failed, using in-memory fallback userId={}", userId, ex);
            warehouseMetrics.countSqlFallback();
            return new WarehouseCountResult(collectAll(userId, pendingOnly, MAX_COLLECT).size(), true);
        }
    }

    public WarehouseListResult listItems(String userId, boolean pendingOnly, int limit, int offset) {
        int capped = Math.min(Math.max(limit, 1), 100);
        int off = Math.max(offset, 0);
        try {
            return new WarehouseListResult(listViaSql(userId, pendingOnly, capped, off), false);
        } catch (RuntimeException ex) {
            log.warn("warehouse list SQL failed, using in-memory fallback userId={} offset={} limit={}", userId, off, capped, ex);
            warehouseMetrics.listSqlFallback();
            if (off >= MAX_COLLECT) {
                throw new BusinessException("仓库条目过多，请缩小筛选范围或联系客服");
            }
            int maxCollect = Math.min(off + capped, MAX_COLLECT);
            List<WarehouseForFrontController.WarehouseItemView> items = collectAll(userId, pendingOnly, maxCollect)
                    .stream()
                    .skip(off)
                    .limit(capped)
                    .toList();
            return new WarehouseListResult(items, true);
        }
    }

    public List<WarehouseForFrontController.WarehouseItemView> list(String userId, boolean pendingOnly, int limit, int offset) {
        return listItems(userId, pendingOnly, limit, offset).items();
    }

    public List<WarehouseForFrontController.WarehouseItemView> list(String userId, boolean pendingOnly) {
        return list(userId, pendingOnly, 200, 0);
    }

    public WarehouseForFrontController.SeriesProgressView seriesProgress(String userId, String mysteryBoxId) {
        if (mysteryBoxId == null || mysteryBoxId.isBlank()) {
            throw new BusinessException("boxId 不能为空");
        }
        Integer total = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(DISTINCT product_id)
                        FROM mystery_box_product_rel
                        WHERE mystery_box_id = ?
                        """,
                Integer.class,
                mysteryBoxId
        );
        Set<String> collectedIds = list(userId, false).stream()
                .filter(item -> mysteryBoxId.equals(item.mysteryBoxId()))
                .map(WarehouseForFrontController.WarehouseItemView::productId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(HashSet::new));
        return new WarehouseForFrontController.SeriesProgressView(
                collectedIds.size(),
                total == null ? 0 : total
        );
    }

    private List<WarehouseForFrontController.WarehouseItemView> collectAll(String userId, boolean pendingOnly, int maxCollect) {
        Set<String> pendingKeys = pendingShipLineKeys(userId);
        List<ScoredItem> scored = new ArrayList<>();
        scored.addAll(listFromOrders(userId, pendingOnly, pendingKeys));
        List<ScoredItem> marketplace = listFromMarketplacePurchases(userId, pendingKeys, MAX_MARKETPLACE_SCAN, 0);
        if (pendingOnly) {
            marketplace.stream()
                    .filter(row -> "MARKETPLACE".equals(row.view().orderStatus()))
                    .forEach(scored::add);
        } else {
            scored.addAll(marketplace);
        }
        scored.sort(Comparator.comparingLong(ScoredItem::sortEpochMs).reversed());
        int cap = Math.max(maxCollect, 1);
        return scored.stream().limit(cap).map(ScoredItem::view).toList();
    }

    private int countOrderWarehouseItems(String userId, boolean pendingOnly) {
        Set<ProductOrderStatus> statuses = pendingOnly ? PENDING : ALL_WAREHOUSE;
        String inClause = statuses.stream()
                .map(s -> "'" + s.getKeyEnName() + "'")
                .collect(Collectors.joining(","));
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COALESCE(SUM(
                            CASE
                                WHEN moi.products IS NULL OR TRIM(moi.products) IN ('', '[]') THEN 0
                                WHEN JSON_VALID(moi.products) THEN JSON_LENGTH(moi.products)
                                ELSE 1
                            END
                        ), 0)
                        FROM mystery_box_order mbo
                        INNER JOIN base_order bo ON bo.id = mbo.id
                        INNER JOIN mystery_box_order_item moi ON moi.mystery_box_order_id = mbo.id
                        WHERE bo.creator_id = ? AND mbo.status IN (%s)
                        """.formatted(inClause),
                Integer.class,
                userId
        );
        return count == null ? 0 : count;
    }

    private int countMarketplaceItems(String userId, boolean pendingOnly) {
        if (pendingOnly) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(*)
                            FROM marketplace_listing
                            WHERE buyer_user_id = ? AND status = 'SOLD'
                              AND (buyer_ship_status IS NULL OR buyer_ship_status <> 'SHIPPED')
                            """,
                    Integer.class,
                    userId
            );
            return count == null ? 0 : count;
        }
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM marketplace_listing WHERE buyer_user_id = ? AND status = 'SOLD'",
                Integer.class,
                userId
        );
        return count == null ? 0 : count;
    }

    private List<WarehouseForFrontController.WarehouseItemView> listViaSql(
            String userId,
            boolean pendingOnly,
            int limit,
            int offset
    ) {
        Set<String> pendingKeys = pendingShipLineKeys(userId);
        Set<ProductOrderStatus> statuses = pendingOnly ? PENDING : ALL_WAREHOUSE;
        String statusIn = statuses.stream()
                .map(s -> "'" + s.getKeyEnName() + "'")
                .collect(Collectors.joining(","));
        String marketplacePending = pendingOnly
                ? " AND (ml.buyer_ship_status IS NULL OR ml.buyer_ship_status <> 'SHIPPED')"
                : "";
        String sql = """
                SELECT source, order_id, order_status, order_item_id, mystery_box_id, product_id,
                       product_name, product_cover, quality_type, listing_id, box_name, box_cover,
                       prize_count, sort_ms
                FROM (
                    SELECT 'ORDER' AS source,
                           mbo.id AS order_id,
                           mbo.status AS order_status,
                           moi.id AS order_item_id,
                           moi.mystery_box_id AS mystery_box_id,
                           JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.id')) AS product_id,
                           JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.name')) AS product_name,
                           JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.cover')) AS product_cover,
                           COALESCE(
                               JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.qualityType.keyEnName')),
                               JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.qualityType'))
                           ) AS quality_type,
                           NULL AS listing_id,
                           JSON_UNQUOTE(JSON_EXTRACT(moi.mystery_box, '$.name')) AS box_name,
                           JSON_UNQUOTE(JSON_EXTRACT(moi.mystery_box, '$.cover')) AS box_cover,
                           CASE WHEN JSON_VALID(moi.products) THEN JSON_LENGTH(moi.products) ELSE 0 END AS prize_count,
                           UNIX_TIMESTAMP(COALESCE(mbo.created_time, bo.created_time)) * 1000 AS sort_ms
                    FROM mystery_box_order mbo
                    INNER JOIN base_order bo ON bo.id = mbo.id
                    INNER JOIN mystery_box_order_item moi ON moi.mystery_box_order_id = mbo.id
                    CROSS JOIN JSON_TABLE(
                        IF(JSON_VALID(moi.products) AND JSON_LENGTH(moi.products) > 0, moi.products, JSON_ARRAY()),
                        '$[*]' COLUMNS (value JSON PATH '$')
                    ) prod
                    WHERE bo.creator_id = ?
                      AND mbo.status IN (%s)
                      AND JSON_UNQUOTE(JSON_EXTRACT(prod.value, '$.id')) IS NOT NULL
                    UNION ALL
                    SELECT 'MARKETPLACE' AS source,
                           ml.mystery_box_order_id AS order_id,
                           CASE WHEN ml.buyer_ship_status = 'SHIPPED' THEN 'SHIPPED' ELSE 'MARKETPLACE' END AS order_status,
                           ml.mystery_box_order_item_id AS order_item_id,
                           NULL AS mystery_box_id,
                           ml.product_id AS product_id,
                           ml.product_name AS product_name,
                           ml.cover AS product_cover,
                           ml.quality_type AS quality_type,
                           ml.id AS listing_id,
                           NULL AS box_name,
                           NULL AS box_cover,
                           1 AS prize_count,
                           UNIX_TIMESTAMP(ml.sold_time) * 1000 AS sort_ms
                    FROM marketplace_listing ml
                    WHERE ml.buyer_user_id = ? AND ml.status = 'SOLD'%s
                ) wh_rows
                ORDER BY sort_ms DESC
                LIMIT ? OFFSET ?
                """.formatted(statusIn, marketplacePending);
        return jdbcTemplate.query(
                sql,
                (rs, rowNum) -> {
                    String orderId = rs.getString("order_id");
                    String orderItemId = rs.getString("order_item_id");
                    String productId = rs.getString("product_id");
                    String source = rs.getString("source");
                    String createdTime = ISO.format(Instant.ofEpochMilli(rs.getLong("sort_ms")));
                    return new WarehouseForFrontController.WarehouseItemView(
                            orderId,
                            rs.getString("order_status"),
                            orderItemId,
                            rs.getString("mystery_box_id"),
                            rs.getString("box_name"),
                            productId,
                            rs.getString("product_name"),
                            rs.getString("product_cover"),
                            rs.getString("quality_type"),
                            source,
                            rs.getString("listing_id"),
                            pendingKeys.contains(lineKey(orderId, orderItemId, productId)),
                            rs.getString("box_cover"),
                            createdTime,
                            rs.getInt("prize_count")
                    );
                },
                userId,
                userId,
                limit,
                offset
        );
    }

    private Set<String> pendingShipLineKeys(String userId) {
        List<String> keys = jdbcTemplate.query(
                """
                        SELECT CONCAT(i.order_id, '|', COALESCE(i.order_item_id, ''), '|', i.product_id) AS line_key
                        FROM warehouse_ship_request_item i
                        INNER JOIN warehouse_ship_request r ON r.id = i.request_id
                        WHERE r.user_id = ? AND r.status = 'PENDING'
                        """,
                (rs, rowNum) -> rs.getString("line_key"),
                userId
        );
        return new HashSet<>(keys);
    }

    private List<ScoredItem> listFromOrders(String userId, boolean pendingOnly, Set<String> pendingKeys) {
        Set<ProductOrderStatus> statuses = pendingOnly ? PENDING : ALL_WAREHOUSE;
        List<MysteryBoxOrder> orders = mysteryBoxOrderRepository.sql().createQuery(MysteryBoxOrderTable.$)
                .where(MysteryBoxOrderTable.$.baseOrder().creatorId().eq(userId))
                .where(MysteryBoxOrderTable.$.status().in(statuses))
                .orderBy(MysteryBoxOrderTable.$.createdTime().desc())
                .select(MysteryBoxOrderTable.$.fetch(MysteryBoxOrderRepository.COMPLEX_FETCHER_FOR_FRONT))
                .limit(MAX_ORDER_SCAN)
                .execute();

        List<String> missingNameIds = new ArrayList<>();
        for (MysteryBoxOrder order : orders) {
            for (var line : order.items()) {
                List<ProductView> products = line.products();
                if (products == null || products.isEmpty()) {
                    continue;
                }
                for (ProductView product : products) {
                    if (product == null || product.getId() == null) {
                        continue;
                    }
                    if (readProductName(product) == null) {
                        missingNameIds.add(product.getId());
                    }
                }
            }
        }

        Map<String, Product> productById = loadProductsByIds(missingNameIds);
        List<ScoredItem> items = new ArrayList<>();

        for (MysteryBoxOrder order : orders) {
            String status = order.status().getKeyEnName();
            long sortMs = toEpochMs(order.createdTime());
            String createdTime = formatInstant(order.createdTime());
            for (var line : order.items()) {
                List<ProductView> products = line.products();
                if (products == null || products.isEmpty()) {
                    continue;
                }
                int prizeCount = products.size();
                String boxName = readMysteryBoxName(line);
                String boxCover = readMysteryBoxCover(line);
                for (ProductView product : products) {
                    if (product == null || product.getId() == null) {
                        continue;
                    }
                    String productName = resolveProductName(product, productById);
                    String cover = readProductCover(product);
                    items.add(new ScoredItem(
                            new WarehouseForFrontController.WarehouseItemView(
                                    order.id(),
                                    status,
                                    line.id(),
                                    line.mysteryBoxId(),
                                    boxName,
                                    product.getId(),
                                    productName,
                                    cover,
                                    product.getQualityType() == null ? null : product.getQualityType().getKeyEnName(),
                                    "ORDER",
                                    null,
                                    pendingKeys.contains(lineKey(order.id(), line.id(), product.getId())),
                                    boxCover,
                                    createdTime,
                                    prizeCount
                            ),
                            sortMs
                    ));
                }
            }
        }

        return items;
    }

    private List<ScoredItem> listFromMarketplacePurchases(
            String userId,
            Set<String> pendingKeys,
            int limit,
            int offset
    ) {
        int size = Math.min(Math.max(limit, 1), MAX_MARKETPLACE_SCAN);
        int off = Math.max(offset, 0);
        return jdbcTemplate.query(
                """
                        SELECT id, mystery_box_order_id, mystery_box_order_item_id, product_id,
                               product_name, cover, quality_type, buyer_ship_status, sold_time
                        FROM marketplace_listing
                        WHERE buyer_user_id = ? AND status = 'SOLD'
                        ORDER BY sold_time DESC
                        LIMIT ? OFFSET ?
                        """,
                (rs, rowNum) -> {
                    String orderId = rs.getString("mystery_box_order_id");
                    String orderItemId = rs.getString("mystery_box_order_item_id");
                    String productId = rs.getString("product_id");
                    String shipStatus = rs.getString("buyer_ship_status");
                    String orderStatus = "SHIPPED".equals(shipStatus) ? "SHIPPED" : "MARKETPLACE";
                    Timestamp soldTime = rs.getTimestamp("sold_time");
                    long sortMs = soldTime == null ? 0L : soldTime.toInstant().toEpochMilli();
                    String createdTime = soldTime == null ? null : ISO.format(soldTime.toInstant());
                    return new ScoredItem(
                            new WarehouseForFrontController.WarehouseItemView(
                                    orderId,
                                    orderStatus,
                                    orderItemId,
                                    null,
                                    null,
                                    productId,
                                    rs.getString("product_name"),
                                    rs.getString("cover"),
                                    rs.getString("quality_type"),
                                    "MARKETPLACE",
                                    rs.getString("id"),
                                    pendingKeys.contains(lineKey(orderId, orderItemId, productId)),
                                    null,
                                    createdTime,
                                    1
                            ),
                            sortMs
                    );
                },
                userId,
                size,
                off
        );
    }

    private static String lineKey(String orderId, String orderItemId, String productId) {
        return orderId + "|" + (orderItemId == null ? "" : orderItemId) + "|" + productId;
    }

    private Map<String, Product> loadProductsByIds(List<String> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        List<String> distinct = productIds.stream().distinct().toList();
        Map<String, Product> map = new HashMap<>();
        for (Product product : productRepository.findByIds(distinct)) {
            map.put(product.id(), product);
        }
        return map;
    }

    private static String resolveProductName(ProductView product, Map<String, Product> loaded) {
        String name = readProductName(product);
        if (name != null) {
            return name;
        }
        Product entity = loaded.get(product.getId());
        if (entity != null && entity.name() != null && !entity.name().isBlank()) {
            return entity.name();
        }
        return null;
    }

    private static String readProductName(ProductView product) {
        if (product == null) {
            return null;
        }
        try {
            String name = product.getName();
            return name == null || name.isBlank() ? null : name;
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static String readProductCover(ProductView product) {
        if (product == null) {
            return null;
        }
        try {
            return product.getCover();
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static String readMysteryBoxName(io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem line) {
        if (line == null || line.mysteryBox() == null) {
            return null;
        }
        try {
            String name = line.mysteryBox().getName();
            return name == null || name.isBlank() ? null : name;
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static String readMysteryBoxCover(io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem line) {
        if (line == null || line.mysteryBox() == null) {
            return null;
        }
        try {
            String cover = line.mysteryBox().getCover();
            return cover == null || cover.isBlank() ? null : cover;
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static long toEpochMs(java.time.LocalDateTime time) {
        if (time == null) {
            return 0L;
        }
        return time.toInstant(ZoneOffset.UTC).toEpochMilli();
    }

    private static String formatInstant(java.time.LocalDateTime time) {
        if (time == null) {
            return null;
        }
        return ISO.format(time.toInstant(ZoneOffset.UTC));
    }
}
