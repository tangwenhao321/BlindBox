package io.github.qifan777.server.warehouse;

import io.github.qifan777.server.dict.model.ProductOrderStatus;

import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.address.entity.Address;
import io.github.qifan777.server.address.entity.dto.AddressView;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.carriage.service.CarriageTemplateService;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.Product;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class WarehouseShipService {
    private final WarehouseService warehouseService;
    private final AddressRepository addressRepository;
    private final CarriageTemplateService carriageTemplateService;
    private final ProductRepository productRepository;
    private final UserWalletService userWalletService;
    private final UserNotificationService userNotificationService;
    private final MysteryBoxOrderService mysteryBoxOrderService;
    private final JdbcTemplate jdbcTemplate;
    private final MarketProperties marketProperties;

    public ShipQuoteView quote(String userId, String addressId, List<ShipLineRequest> lines) {
        List<ResolvedLine> resolved = resolveLines(userId, lines);
        Address address = addressRepository.findUserAddressById(addressId)
                .filter(a -> a.creator().id().equals(userId))
                .orElseThrow(() -> new BusinessException("请选择有效收货地址"));

        BigDecimal marketValue = BigDecimal.ZERO;
        BigDecimal shipValue = BigDecimal.ZERO;
        int remindCount = 0;
        int marketCount = 0;
        for (ResolvedLine line : resolved) {
            shipValue = shipValue.add(line.productPrice());
            if ("MARKETPLACE".equals(line.source())) {
                marketValue = marketValue.add(line.productPrice());
                marketCount++;
            } else if (ProductOrderStatus.TO_BE_DELIVERED.getKeyEnName().equals(line.orderStatus())) {
                remindCount++;
            }
        }

        BigDecimal deliveryFee = BigDecimal.ZERO;
        if (shipValue.compareTo(BigDecimal.ZERO) > 0) {
            deliveryFee = carriageTemplateService.calculate(address.id(), shipValue);
        }

        String feeHint;
        if (marketCount > 0 && remindCount > 0) {
            feeHint = "盲盒赏品与集市赏品合并发货，运费按收货地址与赏品价值计算";
        } else if (marketCount > 0) {
            feeHint = "集市购入赏品需支付运费后安排发货";
        } else {
            feeHint = "发货运费按收货地址与赏品价值计算，提交后将通知仓库处理";
        }

        return new ShipQuoteView(
                resolved.size(),
                remindCount,
                marketCount,
                marketValue,
                deliveryFee,
                deliveryFee,
                feeHint,
                formatAddress(address)
        );
    }

    @Transactional
    public String submit(String userId, String addressId, List<ShipLineRequest> lines) {
        ShipQuoteView quote = quote(userId, addressId, lines);
        List<ResolvedLine> resolved = resolveLines(userId, lines);
        assertNoDuplicatePending(userId, resolved);

        String requestId = IdUtil.fastSimpleUUID();
        Address address = addressRepository.findUserAddressById(addressId)
                .filter(a -> a.creator().id().equals(userId))
                .orElseThrow(() -> new BusinessException("请选择有效收货地址"));

        if (quote.payAmount().compareTo(BigDecimal.ZERO) > 0) {
            userWalletService.deduct(
                    userId,
                    quote.payAmount(),
                    "WAREHOUSE_SHIP",
                    "仓库发货运费（" + resolved.size() + " 件）",
                    requestId
            );
        }

        jdbcTemplate.update(
                """
                        INSERT INTO warehouse_ship_request (
                            id, user_id, address_id, address_snapshot, status, item_count,
                            product_amount, delivery_fee, pay_amount, created_time, edited_time
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                        """,
                requestId,
                userId,
                addressId,
                quote.addressText(),
                "PENDING",
                resolved.size(),
                quote.productAmount(),
                quote.deliveryFee(),
                quote.payAmount(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        for (ResolvedLine line : resolved) {
            jdbcTemplate.update(
                    """
                            INSERT INTO warehouse_ship_request_item (
                                id, request_id, order_id, order_item_id, product_id, product_name, source, listing_id, created_time
                            ) VALUES (?,?,?,?,?,?,?,?,?)
                            """,
                    IdUtil.fastSimpleUUID(),
                    requestId,
                    line.orderId(),
                    line.orderItemId(),
                    line.productId(),
                    line.productName(),
                    line.source(),
                    line.listingId(),
                    LocalDateTime.now()
            );
        }

        userNotificationService.push(
                userId,
                "WAREHOUSE_SHIP",
                "发货申请已提交",
                resolved.size() + " 件赏品，运费 " + marketProperties.formatAmount(quote.payAmount()) + "，仓库将尽快处理",
                requestId
        );
        return requestId;
    }

    @Transactional
    public void cancelForUser(String userId, String requestId) {
        List<String> statuses = jdbcTemplate.query(
                "SELECT status FROM warehouse_ship_request WHERE id = ? AND user_id = ?",
                (rs, rowNum) -> rs.getString("status"),
                requestId,
                userId
        );
        if (statuses.isEmpty()) {
            throw new BusinessException("发货申请不存在");
        }
        if (!"PENDING".equals(statuses.get(0))) {
            throw new BusinessException("该申请已处理，无法取消");
        }
        cancelPendingRequest(requestId, userId, "订单退款取消发货申请退回运费");
    }

    /**
     * Cancel PENDING warehouse ship requests that include items for {@code orderId}
     * (items link via {@code warehouse_ship_request_item.order_id}). Refunds shipping fee if paid.
     */
    @Transactional
    public int cancelPendingForOrder(String orderId) {
        if (orderId == null || orderId.isBlank()) {
            return 0;
        }
        List<String> requestIds = jdbcTemplate.query(
                """
                        SELECT DISTINCT r.id
                        FROM warehouse_ship_request r
                        INNER JOIN warehouse_ship_request_item i ON i.request_id = r.id
                        WHERE r.status = 'PENDING' AND i.order_id = ?
                        """,
                (rs, rowNum) -> rs.getString("id"),
                orderId
        );
        int cancelled = 0;
        for (String requestId : requestIds) {
            String userId = jdbcTemplate.queryForObject(
                    "SELECT user_id FROM warehouse_ship_request WHERE id = ?",
                    String.class,
                    requestId
            );
            int updated = cancelPendingRequest(requestId, userId, "订单退款取消发货申请退回运费");
            if (updated > 0) {
                cancelled++;
                if (userId != null) {
                    userNotificationService.push(
                            userId,
                            "WAREHOUSE_SHIP",
                            "发货申请已取消",
                            "订单退款，待发货申请已自动取消，运费如有已退回",
                            requestId
                    );
                }
            }
        }
        return cancelled;
    }

    private int cancelPendingRequest(String requestId, String userId, String feeRefundRemark) {
        BigDecimal payAmount = jdbcTemplate.queryForObject(
                "SELECT pay_amount FROM warehouse_ship_request WHERE id = ?",
                BigDecimal.class,
                requestId
        );
        int updated = jdbcTemplate.update(
                "UPDATE warehouse_ship_request SET status = 'CANCELLED', edited_time = ? WHERE id = ? AND status = 'PENDING'",
                LocalDateTime.now(),
                requestId
        );
        if (updated == 1 && userId != null && payAmount != null && payAmount.compareTo(BigDecimal.ZERO) > 0) {
            userWalletService.credit(userId, payAmount, "WAREHOUSE_SHIP_REFUND", feeRefundRemark, requestId);
        }
        return updated;
    }

    @Transactional
    public void rejectForAdmin(String requestId, String reason) {
        List<String> rows = jdbcTemplate.query(
                "SELECT status, user_id, pay_amount FROM warehouse_ship_request WHERE id = ?",
                (rs, rowNum) -> rs.getString("status"),
                requestId
        );
        if (rows.isEmpty()) {
            throw new BusinessException("发货申请不存在");
        }
        if (!"PENDING".equals(rows.get(0))) {
            throw new BusinessException("该申请已处理");
        }
        String userId = jdbcTemplate.queryForObject(
                "SELECT user_id FROM warehouse_ship_request WHERE id = ?",
                String.class,
                requestId
        );
        BigDecimal payAmount = jdbcTemplate.queryForObject(
                "SELECT pay_amount FROM warehouse_ship_request WHERE id = ?",
                BigDecimal.class,
                requestId
        );
        int updated = jdbcTemplate.update(
                "UPDATE warehouse_ship_request SET status = 'REJECTED', reject_reason = ?, edited_time = ? WHERE id = ? AND status = 'PENDING'",
                reason,
                LocalDateTime.now(),
                requestId
        );
        if (updated == 0) {
            throw new BusinessException("该申请已处理");
        }
        if (userId != null && payAmount != null && payAmount.compareTo(BigDecimal.ZERO) > 0) {
            userWalletService.credit(userId, payAmount, "WAREHOUSE_SHIP_REFUND", "发货申请被驳回，运费已退回", requestId);
        }
        if (userId != null) {
            userNotificationService.push(
                    userId,
                    "WAREHOUSE_SHIP",
                    "发货申请未通过",
                    reason == null || reason.isBlank() ? "仓库暂无法处理您的发货申请，运费已退回" : reason,
                    requestId
            );
        }
    }

    public List<ShipRequestSummary> listForUser(String userId, int limit) {
        int capped = Math.min(Math.max(limit, 1), 50);
        return jdbcTemplate.query(
                """
                        SELECT id, status, item_count, pay_amount, tracking_number, carrier_code,
                               address_snapshot, reject_reason, created_time
                        FROM warehouse_ship_request
                        WHERE user_id = ?
                        ORDER BY created_time DESC
                        LIMIT ?
                        """,
                (rs, rowNum) -> new ShipRequestSummary(
                        rs.getString("id"),
                        rs.getString("status"),
                        rs.getInt("item_count"),
                        rs.getBigDecimal("pay_amount"),
                        rs.getString("tracking_number"),
                        rs.getString("carrier_code"),
                        rs.getString("address_snapshot"),
                        rs.getString("reject_reason"),
                        toLocalDateTime(rs.getTimestamp("created_time"))
                ),
                userId,
                capped
        );
    }

    public AdminShipPage adminQuery(String status, int pageNum, int pageSize) {
        int page = Math.max(pageNum, 1);
        int size = Math.min(Math.max(pageSize, 1), 100);
        int offset = (page - 1) * size;
        String statusFilter = (status == null || status.isBlank()) ? null : status.trim();

        Long total = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(1) FROM warehouse_ship_request
                        WHERE (? IS NULL OR status = ?)
                        """,
                Long.class,
                statusFilter,
                statusFilter
        );

        List<AdminShipRequestRow> rows = jdbcTemplate.query(
                """
                        SELECT r.id, r.user_id, r.status, r.item_count, r.pay_amount, r.delivery_fee,
                               r.tracking_number, r.carrier_code, r.address_snapshot, r.reject_reason,
                               r.created_time, u.nickname, u.phone
                        FROM warehouse_ship_request r
                        LEFT JOIN user u ON u.id = r.user_id
                        WHERE (? IS NULL OR r.status = ?)
                        ORDER BY r.created_time DESC
                        LIMIT ? OFFSET ?
                        """,
                (rs, rowNum) -> new AdminShipRequestRow(
                        rs.getString("id"),
                        rs.getString("user_id"),
                        rs.getString("status"),
                        rs.getInt("item_count"),
                        rs.getBigDecimal("pay_amount"),
                        rs.getBigDecimal("delivery_fee"),
                        rs.getString("tracking_number"),
                        rs.getString("carrier_code"),
                        rs.getString("address_snapshot"),
                        rs.getString("reject_reason"),
                        toLocalDateTime(rs.getTimestamp("created_time")),
                        rs.getString("nickname"),
                        rs.getString("phone")
                ),
                statusFilter,
                statusFilter,
                size,
                offset
        );
        return new AdminShipPage(rows, total == null ? 0 : total);
    }

    public AdminShipRequestDetail adminDetail(String requestId) {
        List<AdminShipRequestRow> header = jdbcTemplate.query(
                """
                        SELECT r.id, r.user_id, r.status, r.item_count, r.pay_amount, r.delivery_fee,
                               r.tracking_number, r.carrier_code, r.address_snapshot, r.reject_reason,
                               r.created_time, u.nickname, u.phone
                        FROM warehouse_ship_request r
                        LEFT JOIN user u ON u.id = r.user_id
                        WHERE r.id = ?
                        """,
                (rs, rowNum) -> new AdminShipRequestRow(
                        rs.getString("id"),
                        rs.getString("user_id"),
                        rs.getString("status"),
                        rs.getInt("item_count"),
                        rs.getBigDecimal("pay_amount"),
                        rs.getBigDecimal("delivery_fee"),
                        rs.getString("tracking_number"),
                        rs.getString("carrier_code"),
                        rs.getString("address_snapshot"),
                        rs.getString("reject_reason"),
                        toLocalDateTime(rs.getTimestamp("created_time")),
                        rs.getString("nickname"),
                        rs.getString("phone")
                ),
                requestId
        );
        if (header.isEmpty()) {
            throw new BusinessException("发货申请不存在");
        }
        List<ShipRequestItemRow> items = jdbcTemplate.query(
                """
                        SELECT product_name, source, order_id, order_item_id, product_id, listing_id
                        FROM warehouse_ship_request_item
                        WHERE request_id = ?
                        ORDER BY created_time ASC
                        """,
                (rs, rowNum) -> new ShipRequestItemRow(
                        rs.getString("product_name"),
                        rs.getString("source"),
                        rs.getString("order_id"),
                        rs.getString("order_item_id"),
                        rs.getString("product_id"),
                        rs.getString("listing_id")
                ),
                requestId
        );
        return new AdminShipRequestDetail(header.get(0), items);
    }

    @Transactional
    public void fulfillForAdmin(String requestId, String trackingNumber, String carrierCode) {
        if (trackingNumber == null || trackingNumber.isBlank()) {
            throw new BusinessException("请填写物流单号");
        }
        String tracking = trackingNumber.trim();
        String carrier = carrierCode == null || carrierCode.isBlank() ? "auto" : carrierCode.trim();
        List<String> statuses = jdbcTemplate.query(
                "SELECT status FROM warehouse_ship_request WHERE id = ?",
                (rs, rowNum) -> rs.getString("status"),
                requestId
        );
        if (statuses.isEmpty()) {
            throw new BusinessException("发货申请不存在");
        }
        if (!"PENDING".equals(statuses.get(0))) {
            throw new BusinessException("该申请已处理");
        }

        LocalDateTime now = LocalDateTime.now();
        // Claim before deliver / listing side effects so concurrent admin fulfills cannot double-ship.
        int claimed = jdbcTemplate.update(
                """
                        UPDATE warehouse_ship_request
                        SET status = 'SHIPPING', tracking_number = ?, carrier_code = ?, edited_time = ?
                        WHERE id = ? AND status = 'PENDING'
                        """,
                tracking,
                carrier,
                now,
                requestId
        );
        if (claimed != 1) {
            throw new BusinessException("该申请已处理");
        }

        List<ShipRequestItemRow> items = jdbcTemplate.query(
                """
                        SELECT product_name, source, order_id, order_item_id, product_id, listing_id
                        FROM warehouse_ship_request_item WHERE request_id = ?
                        """,
                (rs, rowNum) -> new ShipRequestItemRow(
                        rs.getString("product_name"),
                        rs.getString("source"),
                        rs.getString("order_id"),
                        rs.getString("order_item_id"),
                        rs.getString("product_id"),
                        rs.getString("listing_id")
                ),
                requestId
        );

        Set<String> orderIds = new LinkedHashSet<>();
        for (ShipRequestItemRow item : items) {
            if ("ORDER".equals(item.source())) {
                orderIds.add(item.orderId());
            }
            if ("MARKETPLACE".equals(item.source()) && item.listingId() != null && !item.listingId().isBlank()) {
                jdbcTemplate.update(
                        "UPDATE marketplace_listing SET buyer_ship_status = 'SHIPPED', edited_time = ? WHERE id = ?",
                        now,
                        item.listingId()
                );
            }
        }
        for (String orderId : orderIds) {
            try {
                mysteryBoxOrderService.deliver(orderId, tracking);
            } catch (BusinessException ex) {
                // 订单可能已发货，仍标记本批次完成
            }
        }

        jdbcTemplate.update(
                """
                        UPDATE warehouse_ship_request
                        SET status = 'SHIPPED', edited_time = ?
                        WHERE id = ? AND status = 'SHIPPING'
                        """,
                now,
                requestId
        );

        String userId = jdbcTemplate.queryForObject(
                "SELECT user_id FROM warehouse_ship_request WHERE id = ?",
                String.class,
                requestId
        );
        if (userId != null) {
            userNotificationService.push(
                    userId,
                    "WAREHOUSE_SHIP",
                    "仓库已发货",
                    items.size() + " 件赏品已发出，物流单号 " + tracking,
                    requestId
            );
        }
    }

    private static LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private void assertNoDuplicatePending(String userId, List<ResolvedLine> resolved) {
        for (ResolvedLine line : resolved) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                            SELECT COUNT(1) FROM warehouse_ship_request_item i
                            INNER JOIN warehouse_ship_request r ON r.id = i.request_id
                            WHERE r.user_id = ? AND r.status = 'PENDING'
                              AND i.product_id = ? AND i.order_id = ?
                            """,
                    Integer.class,
                    userId,
                    line.productId(),
                    line.orderId()
            );
            if (count != null && count > 0) {
                throw new BusinessException("「" + line.productName() + "」已有待处理的发货申请");
            }
        }
    }

    private List<ResolvedLine> resolveLines(String userId, List<ShipLineRequest> lines) {
        if (lines == null || lines.isEmpty()) {
            throw new BusinessException("请选择要发货的赏品");
        }
        if (lines.size() > 30) {
            throw new BusinessException("单次最多申请 30 件赏品发货");
        }

        List<WarehouseForFrontController.WarehouseItemView> owned = warehouseService.list(userId, true);
        Set<String> keys = new HashSet<>();
        for (var item : owned) {
            keys.add(lineKey(item.orderId(), item.orderItemId(), item.productId()));
        }

        List<ResolvedLine> resolved = new ArrayList<>();
        for (ShipLineRequest req : lines) {
            String key = lineKey(req.orderId(), req.orderItemId(), req.productId());
            if (!keys.contains(key)) {
                throw new BusinessException("赏品不在仓库或不可发货");
            }
            WarehouseForFrontController.WarehouseItemView match = owned.stream()
                    .filter(i -> lineKey(i.orderId(), i.orderItemId(), i.productId()).equals(key))
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("赏品不存在"));

            if (!isShippable(match)) {
                throw new BusinessException("「" + match.productName() + "」当前状态不可申请发货");
            }

            BigDecimal price = BigDecimal.ZERO;
            if ("MARKETPLACE".equals(match.source())) {
                Product product = productRepository.findById(match.productId()).orElse(null);
                if (product != null && product.price() != null) {
                    price = product.price();
                }
            }

            resolved.add(new ResolvedLine(
                    match.orderId(),
                    match.orderItemId(),
                    match.productId(),
                    match.productName(),
                    match.source(),
                    match.orderStatus(),
                    price,
                    match.listingId()
            ));
        }
        return resolved;
    }

    private static boolean isShippable(WarehouseForFrontController.WarehouseItemView item) {
        if (item.pendingShipRequest()) {
            return false;
        }
        if ("MARKETPLACE".equals(item.source())) {
            return "MARKETPLACE".equals(item.orderStatus());
        }
        return ProductOrderStatus.TO_BE_DELIVERED.getKeyEnName().equals(item.orderStatus());
    }

    private static String lineKey(String orderId, String orderItemId, String productId) {
        return orderId + "|" + (orderItemId == null ? "" : orderItemId) + "|" + productId;
    }

    private static String formatAddress(Address address) {
        AddressView view = new AddressView(address);
        return view.getRealName() + " " + view.getPhoneNumber() + " "
                + view.getProvince() + view.getCity() + view.getDistrict() + " "
                + view.getDetails() + (view.getHouseNumber() == null ? "" : view.getHouseNumber());
    }

    public record ShipLineRequest(String orderId, String orderItemId, String productId) {
    }

    public record ShipQuoteView(
            int itemCount,
            int orderRemindCount,
            int marketplaceCount,
            BigDecimal productAmount,
            BigDecimal deliveryFee,
            BigDecimal payAmount,
            String feeHint,
            String addressText
    ) {
    }

    public record ShipRequestSummary(
            String id,
            String status,
            int itemCount,
            BigDecimal payAmount,
            String trackingNumber,
            String carrierCode,
            String addressSnapshot,
            String rejectReason,
            LocalDateTime createdTime
    ) {
    }

    public record AdminShipRequestRow(
            String id,
            String userId,
            String status,
            int itemCount,
            BigDecimal payAmount,
            BigDecimal deliveryFee,
            String trackingNumber,
            String carrierCode,
            String addressSnapshot,
            String rejectReason,
            LocalDateTime createdTime,
            String userNickname,
            String userPhone
    ) {
    }

    public record ShipRequestItemRow(
            String productName,
            String source,
            String orderId,
            String orderItemId,
            String productId,
            String listingId
    ) {
    }

    public record AdminShipRequestDetail(AdminShipRequestRow request, List<ShipRequestItemRow> items) {
    }

    public record AdminShipPage(List<AdminShipRequestRow> content, long totalElements) {
    }

    private record ResolvedLine(
            String orderId,
            String orderItemId,
            String productId,
            String productName,
            String source,
            String orderStatus,
            BigDecimal productPrice,
            String listingId
    ) {
    }
}
