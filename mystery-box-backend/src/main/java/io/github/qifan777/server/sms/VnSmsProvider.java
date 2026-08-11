package io.github.qifan777.server.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Vietnam eSMS provider. Enable with {@code sms.provider=vn_esms}.
 * <p>
 * {@link #isReady()} stays false until Partner HTTP send/check are implemented
 * (credentials + {@code partner-wired} alone are insufficient — same pattern as VN logistics).
 * ProductionSafetyValidator refuses {@code partner-wired=true} until then.
 */
@Component
@ConditionalOnProperty(name = "sms.provider", havingValue = "vn_esms")
@Slf4j
public class VnSmsProvider implements SmsProvider {

    @Value("${sms.vn-esms.api-key:}")
    private String apiKey;

    @Value("${sms.vn-esms.secret-key:}")
    private String secretKey;

    @Value("${sms.vn-esms.brandname:}")
    private String brandName;

    /** Flip only when Partner API send/check are wired and tested. */
    @Value("${sms.vn-esms.partner-wired:false}")
    private boolean partnerWired;

    @Override
    public String provider() {
        return "vn_esms";
    }

    @Override
    public boolean isReady() {
        // Partner HTTP client is not implemented — never advertise ready.
        return false;
    }

    @Override
    public String notReadyReason() {
        return "SMS_PROVIDER_NOT_READY: vn_esms Partner send/check HTTP is not implemented "
                + "(keep partner-wired=false; credentials alone are insufficient)";
    }

    @Override
    public boolean send(String phone, String content) {
        log.warn("VnSmsProvider not ready (partnerWired={} keys={}); skip send phone={} brand={}",
                partnerWired,
                StringUtils.hasText(apiKey) && StringUtils.hasText(secretKey),
                maskPhone(phone),
                brandName);
        return false;
    }

    @Override
    public boolean checkCode(String phone, String code) {
        log.warn("VnSmsProvider not ready; check fails phone={}", maskPhone(phone));
        return false;
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) {
            return "****";
        }
        return "****" + phone.substring(phone.length() - 4);
    }
}
