package io.github.qifan777.server.payment.gateway;

import io.github.qifan777.server.order.entity.BaseOrder;
import io.github.qifan777.server.payment.config.MoMoProperties;
import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MoMoPaymentGatewayTest {

    @Test
    void prepayThrowsWhenDisabled() {
        MoMoProperties props = new MoMoProperties();
        props.setEnabled(false);
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(props);
        BaseOrder order = mock(BaseOrder.class);
        when(order.id()).thenReturn("ord-1");

        assertThatThrownBy(() -> gateway.prepay(order, 15, "/notify", "127.0.0.1"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("尚未开通");
    }

    @Test
    void prepayReturnsStubDeeplinkWhenConfigured() {
        MoMoProperties props = new MoMoProperties();
        props.setEnabled(true);
        props.setPartnerCode("partner");
        props.setAccessKey("access");
        props.setSecretKey("secret");
        props.setReturnUrl("mysterybox://payment-return");
        MoMoPaymentGateway gateway = new MoMoPaymentGateway(props);
        BaseOrder order = mock(BaseOrder.class);
        when(order.id()).thenReturn("ord-42");

        MoMoPrepayView view = gateway.prepay(order, 15, "/notify", "127.0.0.1");

        assertThat(view.stub()).isTrue();
        assertThat(view.orderId()).isEqualTo("ord-42");
        assertThat(view.deeplink()).contains("orderId=ord-42");
        assertThat(view.deeplink()).contains("provider=momo");
    }
}
