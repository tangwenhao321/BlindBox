package io.github.qifan777.server.box.order.service;

import io.github.qifan777.server.box.order.config.RetentionProperties;
import io.github.qifan777.server.box.order.repository.MysteryBoxOrderRepository;
import io.github.qifan777.server.payment.config.MarketProperties;
import io.github.qifan777.server.payment.gateway.MoMoPaymentGateway;
import io.github.qifan777.server.payment.gateway.VNPayPaymentGateway;
import io.github.qifan777.server.payment.repository.PaymentRepository;
import io.github.qifan777.server.payment.service.WeChatPayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentRetentionServiceTest {

    @Mock MysteryBoxOrderRepository mysteryBoxOrderRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock JdbcTemplate jdbcTemplate;
    @Mock MarketProperties marketProperties;
    @Mock VNPayPaymentGateway vnpayPaymentGateway;
    @Mock MoMoPaymentGateway momoPaymentGateway;
    @Mock WeChatPayService weChatPayService;
    RetentionProperties retentionProperties;
    PaymentRetentionService service;

    @BeforeEach
    void setUp() {
        retentionProperties = new RetentionProperties();
        service = new PaymentRetentionService(
                mysteryBoxOrderRepository,
                paymentRepository,
                jdbcTemplate,
                marketProperties,
                retentionProperties,
                vnpayPaymentGateway,
                momoPaymentGateway,
                weChatPayService
        );
    }

    @Test
    void defaultsToCnyFiveWhenNotVnd() {
        when(marketProperties.isVndMarket()).thenReturn(false);
        when(marketProperties.getCurrency()).thenReturn("CNY");
        assertThat(service.resolveFlatDiscountAmount()).isEqualByComparingTo("5.00");
    }

    @Test
    void defaultsToVndTenThousand() {
        when(marketProperties.isVndMarket()).thenReturn(true);
        when(marketProperties.getCurrency()).thenReturn("VND");
        assertThat(service.resolveFlatDiscountAmount()).isEqualByComparingTo("10000");
    }

    @Test
    void percentDiscountCappedByFlat() {
        when(marketProperties.getCurrency()).thenReturn("VND");
        retentionProperties.setDiscountPercent(new BigDecimal("10"));
        retentionProperties.setDiscountAmount(new BigDecimal("10000"));
        assertThat(service.resolveDiscountForPayAmount(new BigDecimal("200000")))
                .isEqualByComparingTo("10000");
        assertThat(service.resolveDiscountForPayAmount(new BigDecimal("50000")))
                .isEqualByComparingTo("5000");
    }

    @Test
    void marketZoneFollowsCurrency() {
        when(marketProperties.isVndMarket()).thenReturn(true);
        assertThat(service.marketZone()).isEqualTo(ZoneId.of("Asia/Ho_Chi_Minh"));
        when(marketProperties.isVndMarket()).thenReturn(false);
        assertThat(service.marketZone()).isEqualTo(ZoneId.of("Asia/Shanghai"));
    }

    @Test
    void stalePrepayAmountAcceptedWhenMatchesClaimPlusPay() {
        when(vnpayPaymentGateway.matchesPayAmount(eq(9000000L), eq(new BigDecimal("90000"))))
                .thenReturn(false);
        when(vnpayPaymentGateway.matchesPayAmount(eq(9000000L), eq(new BigDecimal("100000"))))
                .thenReturn(true);
        when(jdbcTemplate.query(
                org.mockito.ArgumentMatchers.contains("order_payment_retention_claim"),
                any(org.springframework.jdbc.core.RowMapper.class),
                eq("ord-1")))
                .thenReturn(java.util.List.of(new BigDecimal("10000")));
        when(mysteryBoxOrderRepository.findByIdForFront("ord-1"))
                .thenThrow(new RuntimeException("not needed for VNPay path default"));
        assertThat(service.matchesPayAmountAllowingStalePrepay(
                "ord-1", 9000000L, new BigDecimal("90000"))).isTrue();
    }
}

