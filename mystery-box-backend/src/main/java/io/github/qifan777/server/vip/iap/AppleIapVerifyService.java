package io.github.qifan777.server.vip.iap;

import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Apple IAP verification scaffold for VN App Store VIP (Guideline 3.1.1).
 * Never grants VIP until App Store Server API verify is wired.
 */
@Service
@Slf4j
public class AppleIapVerifyService {

    @Value("${apple.iap.enabled:false}")
    private boolean enabled;

    @Value("${apple.iap.partner-wired:false}")
    private boolean partnerWired;

    /**
     * Fail-closed: never grants VIP while scaffold / unwired.
     */
    public void verifyAndGrantVip(String orderId, String transactionId, String signedPayload) {
        if (!enabled || !partnerWired) {
            throw new BusinessException(
                    "APPLE_IAP_NOT_WIRED: Apple IAP 未接通，iOS VIP 请使用 App Store 内购（尚未上线）");
        }
        log.error("Apple IAP partner-wired=true but Server API verify not implemented orderId={}", orderId);
        throw new BusinessException(
                "APPLE_IAP_NOT_WIRED: Apple IAP 校验未实现，拒绝发货");
    }
}
