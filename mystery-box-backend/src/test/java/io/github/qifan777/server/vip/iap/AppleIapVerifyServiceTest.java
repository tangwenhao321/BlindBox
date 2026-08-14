package io.github.qifan777.server.vip.iap;

import io.qifan.infrastructure.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppleIapVerifyServiceTest {

    @Test
    void verifyFailsClosedWhenUnwired() {
        AppleIapVerifyService service = new AppleIapVerifyService();
        ReflectionTestUtils.setField(service, "enabled", false);
        ReflectionTestUtils.setField(service, "partnerWired", false);
        assertThatThrownBy(() -> service.verifyAndGrantVip("o1", "tx", "payload"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("APPLE_IAP_NOT_WIRED");
    }

    @Test
    void verifyFailsClosedEvenWhenFlagsOnWithoutServerApi() {
        AppleIapVerifyService service = new AppleIapVerifyService();
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "partnerWired", true);
        assertThatThrownBy(() -> service.verifyAndGrantVip("o1", "tx", "payload"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("APPLE_IAP_NOT_WIRED");
    }
}
