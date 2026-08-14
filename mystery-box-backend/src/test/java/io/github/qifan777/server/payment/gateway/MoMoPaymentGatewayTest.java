package io.github.qifan777.server.payment.gateway;

import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.config.MoMoProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MoMoPaymentGatewayTest {

    @Test
    void prepayThrowsWhenDisabled() {
        MoMoProperties props = new MoMoProperties();
        props.setEnabled(false);
        props.setStub(false);
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(props);
        BaseOrder order = mock(BaseOrder.class);
        when(order.id()).thenReturn("ord-1");

        assertThatThrownBy(() -> gateway.prepay(order, 15, "/notify", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("尚未开通");
    }

    @Test
    void prepayThrowsWhenStubEvenIfConfigured() {
        MoMoProperties props = configuredProps();
        props.setStub(true);
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(props);
        BaseOrder order = mock(BaseOrder.class);
        when(order.id()).thenReturn("ord-1");

        assertThatThrownBy(() -> gateway.prepay(order, 15, "/notify", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("stub");
    }

    @Test
    void prepayReturnsDeeplinkWhenLiveReady() {
        MoMoProperties props = configuredProps();
        props.setStub(false);
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(props);
        BaseOrder order = mock(BaseOrder.class);
        when(order.id()).thenReturn("ord-42");

        MoMoPrepayView view = gateway.prepay(order, 15, "/notify", "127.0.0.1");

        assertThat(view.stub()).isTrue();
        assertThat(view.orderId()).isEqualTo("ord-42");
        assertThat(view.deeplink()).contains("orderId=ord-42");
        assertThat(view.deeplink()).contains("provider=momo");
    }

    @Test
    void parsePaymentNotify_alwaysFailClosed() {
        MoMoProperties props = configuredProps();
        props.setStub(false);
        props.setPartnerWired(true);
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(props);

        assertThat(gateway.parsePaymentNotify(null, Map.of())).isEmpty();
        assertThat(gateway.parsePaymentNotify(null, Map.of("amount", "10000", "orderId", "o1"))).isEmpty();
    }

    @Test
    void parsePaymentNotify_rejectsWhenStubOrDisabled() {
        MoMoProperties stub = configuredProps();
        stub.setStub(true);
        assertThat(new MoMoPaymentGateway(stub).parsePaymentNotify(null, Map.of("a", "1"))).isEmpty();

        MoMoProperties disabled = configuredProps();
        disabled.setEnabled(false);
        disabled.setStub(false);
        assertThat(new MoMoPaymentGateway(disabled).parsePaymentNotify(null, Map.of("a", "1"))).isEmpty();
    }

    @Test
    void matchesPayAmount_vndMajorUnits() {
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(configuredProps());
        assertThat(gateway.matchesPayAmount(10000L, new BigDecimal("10000"))).isTrue();
        assertThat(gateway.matchesPayAmount(10000L, new BigDecimal("10001"))).isFalse();
        assertThat(gateway.matchesPayAmount(null, new BigDecimal("10000"))).isFalse();
    }

    private static MoMoProperties configuredProps() {
        MoMoProperties props = new MoMoProperties();
        props.setEnabled(true);
        props.setPartnerWired(true);
        props.setPartnerCode("partner");
        props.setAccessKey("access");
        props.setSecretKey("secret");
        props.setReturnUrl("mysterybox://payment-return");
        return props;
    }
}
