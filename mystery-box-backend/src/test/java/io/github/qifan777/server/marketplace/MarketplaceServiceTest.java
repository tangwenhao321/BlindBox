package io.github.qifan777.server.marketplace;

import io.github.qifan777.server.box.item.entity.MysteryBoxOrderItem;
import io.github.qifan777.server.box.item.repository.MysteryBoxOrderItemRepository;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.marketplace.metrics.MarketplacePayoutMetrics;
import io.github.qifan777.server.marketplace.payout.MarketplacePayoutGateway;
import io.github.qifan777.server.marketplace.payout.MarketplacePayoutGatewayRegistry;
import io.github.qifan777.server.marketplace.payout.MarketplacePayoutOutcome;
import io.github.qifan777.server.notification.service.UserNotificationService;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.product.root.entity.dto.ProductView;
import io.github.qifan777.server.product.root.repository.ProductRepository;
import io.github.qifan777.server.user.root.service.UserWalletService;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MarketplaceServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock
    private MysteryBoxOrderItemRepository mysteryBoxOrderItemRepository;
    @Mock
    private UserWalletService userWalletService;
    @Mock
    private UserNotificationService userNotificationService;
    @Mock
    private MarketplacePayoutGatewayRegistry marketplacePayoutGatewayRegistry;
    @Mock
    private MarketplacePayoutMetrics marketplacePayoutMetrics;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private MarketProperties marketProperties;
    @Mock
    private MarketplacePayoutGateway payoutGateway;

    @InjectMocks
    private MarketplaceService marketplaceService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(marketplaceService, "marketplaceFeeRate", new BigDecimal("0.05"));
        ReflectionTestUtils.setField(marketplaceService, "externalPayoutTimeoutHours", 24);
        when(marketProperties.getCurrency()).thenReturn("CNY");
        when(marketplacePayoutGatewayRegistry.resolveConfiguredReady()).thenReturn(payoutGateway);
        when(marketplacePayoutGatewayRegistry.configuredProvider()).thenReturn("wallet");
    }

    @Test
    void computeFee_cnyUsesScaleTwo() {
        Object fee = ReflectionTestUtils.invokeMethod(marketplaceService, "computeFee", new BigDecimal("100.00"));
        assertThat(ReflectionTestUtils.getField(fee, "fee")).isEqualTo(new BigDecimal("5.00"));
        assertThat(ReflectionTestUtils.getField(fee, "sellerProceeds")).isEqualTo(new BigDecimal("95.00"));
    }

    @Test
    void computeFee_vndUsesScaleZero() {
        when(marketProperties.getCurrency()).thenReturn("VND");
        Object fee = ReflectionTestUtils.invokeMethod(marketplaceService, "computeFee", new BigDecimal("100"));
        assertThat(ReflectionTestUtils.getField(fee, "fee")).isEqualTo(new BigDecimal("5"));
        assertThat(ReflectionTestUtils.getField(fee, "sellerProceeds")).isEqualTo(new BigDecimal("95"));
    }

    @Test
    void computeFee_invalidRateFallsBackToFivePercent() {
        ReflectionTestUtils.setField(marketplaceService, "marketplaceFeeRate", new BigDecimal("-0.1"));
        Object fee = ReflectionTestUtils.invokeMethod(marketplaceService, "computeFee", new BigDecimal("200.00"));
        assertThat(ReflectionTestUtils.getField(fee, "fee")).isEqualTo(new BigDecimal("10.00"));
        assertThat(ReflectionTestUtils.getField(fee, "sellerProceeds")).isEqualTo(new BigDecimal("190.00"));
    }

    @Test
    void computeFee_rateOneOrAboveFallsBack() {
        ReflectionTestUtils.setField(marketplaceService, "marketplaceFeeRate", new BigDecimal("1.0"));
        Object fee = ReflectionTestUtils.invokeMethod(marketplaceService, "computeFee", new BigDecimal("80.00"));
        assertThat(ReflectionTestUtils.getField(fee, "fee")).isEqualTo(new BigDecimal("4.00"));
        assertThat(ReflectionTestUtils.getField(fee, "sellerProceeds")).isEqualTo(new BigDecimal("76.00"));
    }

    @Test
    void computeFee_boundaryPrices() {
        Object fee1 = ReflectionTestUtils.invokeMethod(marketplaceService, "computeFee", new BigDecimal("1.00"));
        assertThat(ReflectionTestUtils.getField(fee1, "fee")).isEqualTo(new BigDecimal("0.05"));
        assertThat(ReflectionTestUtils.getField(fee1, "sellerProceeds")).isEqualTo(new BigDecimal("0.95"));

        Object fee999 = ReflectionTestUtils.invokeMethod(marketplaceService, "computeFee", new BigDecimal("999.00"));
        assertThat(ReflectionTestUtils.getField(fee999, "fee")).isEqualTo(new BigDecimal("49.95"));
        assertThat(ReflectionTestUtils.getField(fee999, "sellerProceeds")).isEqualTo(new BigDecimal("949.05"));
    }

    @Test
    void buyListing_createsPendingCoolingTrade() {
        stubCreditScore("buyer-1", "5.00");
        stubCreditScore("seller-1", "5.00");

        Map<String, Object> listing = new HashMap<>();
        listing.put("id", "listing-1");
        listing.put("seller_user_id", "seller-1");
        listing.put("mystery_box_order_id", "order-1");
        listing.put("mystery_box_order_item_id", "item-1");
        listing.put("product_id", "prod-1");
        listing.put("product_name", "赏品A");
        listing.put("price", new BigDecimal("100.00"));
        listing.put("status", "ON_SALE");
        when(jdbcTemplate.queryForMap(contains("FROM marketplace_listing"), eq("listing-1")))
                .thenReturn(listing);

        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any()))
                .thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any(), any()))
                .thenReturn(1);
        when(jdbcTemplate.update(anyString(), any(), any()))
                .thenReturn(1);

        String tradeId = marketplaceService.buyListing("buyer-1", "listing-1");

        assertThat(tradeId).isNotBlank();
        verify(userWalletService).deduct(
                eq("buyer-1"),
                eq(new BigDecimal("100.00")),
                eq("MARKETPLACE_HOLD"),
                anyString(),
                eq(tradeId)
        );
        verify(jdbcTemplate).update(contains("INSERT INTO marketplace_trade"),
                eq(tradeId), eq("listing-1"), eq("seller-1"), eq("buyer-1"),
                eq(new BigDecimal("100.00")), eq(new BigDecimal("5.00")), eq(new BigDecimal("95.00")),
                any(), any(), any());
        verify(jdbcTemplate).update(contains("SET status = 'COOLING'"),
                eq("buyer-1"), any(), eq(tradeId), any(), eq("listing-1"));
    }

    @Test
    void buyListing_mapsInsufficientBalance() {
        stubCreditScore("buyer-1", "5.00");
        stubCreditScore("seller-1", "5.00");
        Map<String, Object> listing = new HashMap<>();
        listing.put("id", "listing-1");
        listing.put("seller_user_id", "seller-1");
        listing.put("mystery_box_order_id", "order-1");
        listing.put("mystery_box_order_item_id", "item-1");
        listing.put("product_id", "prod-1");
        listing.put("product_name", "赏品A");
        listing.put("price", new BigDecimal("100.00"));
        listing.put("status", "ON_SALE");
        when(jdbcTemplate.queryForMap(contains("FROM marketplace_listing"), eq("listing-1")))
                .thenReturn(listing);
        doThrow(new BusinessException("余额不足"))
                .when(userWalletService).deduct(any(), any(), any(), any(), any());

        assertThatThrownBy(() -> marketplaceService.buyListing("buyer-1", "listing-1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("MARKETPLACE_INSUFFICIENT_BALANCE");
    }

    @Test
    void settleTrade_walletPath_completes() {
        Map<String, Object> trade = tradeRow("trade-1", "listing-1", "PENDING_COOLING");
        when(jdbcTemplate.queryForMap(contains("FROM marketplace_trade WHERE id"), eq("trade-1")))
                .thenReturn(trade);

        Map<String, Object> listing = new HashMap<>();
        listing.put("mystery_box_order_item_id", "item-1");
        listing.put("product_id", "prod-1");
        listing.put("product_name", "赏品A");
        listing.put("status", "COOLING");
        when(jdbcTemplate.queryForMap(contains("FROM marketplace_listing WHERE id"), eq("listing-1")))
                .thenReturn(listing);

        when(payoutGateway.settleTrade(any(), any(), any(), any(), any(), eq("trade-1")))
                .thenReturn(MarketplacePayoutOutcome.SETTLED);

        ProductView product = mock(ProductView.class);
        when(product.getId()).thenReturn("prod-1");
        MysteryBoxOrderItem item = mock(MysteryBoxOrderItem.class);
        when(item.products()).thenReturn(new ArrayList<>(List.of(product)));
        when(mysteryBoxOrderItemRepository.findByIdWithProductsForUpdate("item-1")).thenReturn(Optional.of(item));

        when(jdbcTemplate.update(contains("UPDATE marketplace_trade"), any(), eq("trade-1"))).thenReturn(1);
        when(jdbcTemplate.update(contains("UPDATE marketplace_trade"), eq("COMPLETED"), any(), eq("trade-1"))).thenReturn(1);
        when(jdbcTemplate.update(contains("SET status = 'SOLD'"), any(), any(), eq("listing-1"))).thenReturn(1);
        when(jdbcTemplate.update(contains("INSERT IGNORE INTO user_market_credit"), any(), any(), any())).thenReturn(1);
        when(jdbcTemplate.update(contains("trade_count = trade_count + 1"), any(), anyString())).thenReturn(1);

        marketplaceService.settleTrade("trade-1");

        verify(jdbcTemplate).update(
                contains("UPDATE marketplace_trade"),
                eq("COMPLETED"),
                any(),
                eq("trade-1")
        );
        verify(marketplacePayoutMetrics, never()).pendingExternalCreated();
        verify(userNotificationService).push(eq("buyer-1"), eq("MARKETPLACE"), eq("集市购买成功"), anyString(), eq("listing-1"));
    }

    @Test
    void failExternalPayout_refundsBuyerAndRestoresListing() {
        Map<String, Object> trade = tradeRow("trade-1", "listing-1", "PENDING_EXTERNAL");
        when(jdbcTemplate.queryForMap(contains("FROM marketplace_trade WHERE id"), eq("trade-1")))
                .thenReturn(trade);

        Map<String, Object> listing = new HashMap<>();
        listing.put("mystery_box_order_item_id", "item-1");
        listing.put("product_id", "prod-1");
        listing.put("product_name", "赏品A");
        listing.put("status", "SOLD");
        when(jdbcTemplate.queryForMap(contains("FROM marketplace_listing WHERE id"), eq("listing-1")))
                .thenReturn(listing);

        when(jdbcTemplate.update(contains("FAILED_EXTERNAL"), any(), eq("trade-1"))).thenReturn(1);
        when(jdbcTemplate.update(contains("SET status = 'ON_SALE'"), any(), eq("listing-1"))).thenReturn(1);
        when(jdbcTemplate.update(contains("trade_count = GREATEST"), any(), anyString())).thenReturn(1);

        // Product already on seller item → restore is a no-op (avoids constructing ProductView from Jimmer Product)
        ProductView product = mock(ProductView.class);
        when(product.getId()).thenReturn("prod-1");
        MysteryBoxOrderItem item = mock(MysteryBoxOrderItem.class);
        when(item.products()).thenReturn(new ArrayList<>(List.of(product)));
        when(mysteryBoxOrderItemRepository.findById("item-1")).thenReturn(Optional.of(item));

        marketplaceService.failExternalPayout("trade-1");

        verify(userWalletService).credit(
                eq("buyer-1"),
                eq(new BigDecimal("100.00")),
                eq("MARKETPLACE_HOLD_REFUND"),
                anyString(),
                eq("trade-1")
        );
        verify(jdbcTemplate).update(contains("SET status = 'ON_SALE'"), any(), eq("listing-1"));
        verify(marketplacePayoutMetrics).pendingExternalFailed();
        verify(productRepository, never()).findById(anyString());
    }

    @Test
    void completeExternalPayout_fromPendingExternal() {
        Map<String, Object> trade = tradeRow("trade-1", "listing-1", "PENDING_EXTERNAL");
        when(jdbcTemplate.queryForMap(contains("FROM marketplace_trade WHERE id"), eq("trade-1")))
                .thenReturn(trade);
        when(jdbcTemplate.queryForObject(contains("product_name"), eq(String.class), eq("listing-1")))
                .thenReturn("赏品A");
        when(jdbcTemplate.update(contains("SET status = 'COMPLETED'"), any(), eq("txn-ext-1"), eq("trade-1"))).thenReturn(1);

        marketplaceService.completeExternalPayout("trade-1", "txn-ext-1");

        verify(jdbcTemplate).update(contains("SET status = 'COMPLETED'"), any(), eq("txn-ext-1"), eq("trade-1"));
        verify(marketplacePayoutMetrics).pendingExternalCompleted();
        verify(userNotificationService).push(eq("seller-1"), eq("MARKETPLACE"), eq("外部打款已完成"), anyString(), eq("listing-1"));
    }

    private void stubCreditScore(String userId, String score) {
        when(jdbcTemplate.update(contains("INSERT IGNORE INTO user_market_credit"), eq(userId), any(), any()))
                .thenReturn(1);
        when(jdbcTemplate.queryForObject(contains("FROM user_market_credit"), eq(BigDecimal.class), eq(userId)))
                .thenReturn(new BigDecimal(score));
    }

    private static Map<String, Object> tradeRow(String tradeId, String listingId, String status) {
        Map<String, Object> trade = new HashMap<>();
        trade.put("id", tradeId);
        trade.put("listing_id", listingId);
        trade.put("seller_id", "seller-1");
        trade.put("buyer_id", "buyer-1");
        trade.put("price", new BigDecimal("100.00"));
        trade.put("fee", new BigDecimal("5.00"));
        trade.put("seller_proceeds", new BigDecimal("95.00"));
        trade.put("status", status);
        return trade;
    }
}
