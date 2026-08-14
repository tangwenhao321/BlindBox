package io.github.qifan777.server.box.order.controller;

import com.github.binarywang.wxpay.bean.notify.SignatureHeader;
import io.github.qifan777.server.box.order.service.MysteryBoxOrderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MysteryBoxOrderNotifyControllerTest {

    @Mock
    private MysteryBoxOrderService mysteryBoxOrderService;

    @InjectMocks
    private MysteryBoxOrderForFrontController controller;

    @Test
    void paymentNotifyWechat_delegatesToServiceWithSignatureHeader() {
        when(mysteryBoxOrderService.paymentNotifyWechat(eq("{\"id\":\"evt\"}"), any(SignatureHeader.class)))
                .thenReturn("SUCCESS");

        String result = controller.paymentNotifyWechat(
                "{\"id\":\"evt\"}",
                "1700000000",
                "nonce-1",
                "sig-1",
                "serial-1"
        );

        assertThat(result).isEqualTo("SUCCESS");
        ArgumentCaptor<SignatureHeader> headerCaptor = ArgumentCaptor.forClass(SignatureHeader.class);
        verify(mysteryBoxOrderService).paymentNotifyWechat(eq("{\"id\":\"evt\"}"), headerCaptor.capture());
        SignatureHeader header = headerCaptor.getValue();
        assertThat(header.getTimeStamp()).isEqualTo("1700000000");
        assertThat(header.getNonce()).isEqualTo("nonce-1");
        assertThat(header.getSignature()).isEqualTo("sig-1");
        assertThat(header.getSerial()).isEqualTo("serial-1");
    }

    @Test
    void paymentNotifyVNPay_getAndPost_delegate() {
        Map<String, String> params = Map.of("vnp_TxnRef", "o1");
        when(mysteryBoxOrderService.paymentNotifyVNPay(any())).thenReturn("{\"RspCode\":\"00\"}");

        assertThat(controller.paymentNotifyVNPayGet(params)).contains("00");
        assertThat(controller.paymentNotifyVNPayPost(params)).contains("00");
        verify(mysteryBoxOrderService, times(2)).paymentNotifyVNPay(any());
    }

    @Test
    void paymentNotifyMoMo_getAndPost_delegate() {
        Map<String, String> params = Map.of("orderId", "o1");
        when(mysteryBoxOrderService.paymentNotifyMoMo(any())).thenReturn("{\"resultCode\":0}");

        assertThat(controller.paymentNotifyMoMoGet(params)).contains("0");
        assertThat(controller.paymentNotifyMoMoPost(params)).contains("0");
        verify(mysteryBoxOrderService, times(2)).paymentNotifyMoMo(any());
    }
}
