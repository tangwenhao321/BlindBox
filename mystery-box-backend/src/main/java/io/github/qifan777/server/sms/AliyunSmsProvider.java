package io.github.qifan777.server.sms;

import io.qifan.infrastructure.sms.SmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Bridges the existing Aliyun path ({@code sms.provider=ali_yun}) onto {@link SmsProvider}.
 * OTP send remains on the starter {@code /sms/send} endpoint; check delegates to {@link SmsService}.
 */
@Component
@ConditionalOnProperty(name = "sms.provider", havingValue = "ali_yun")
@RequiredArgsConstructor
@Slf4j
public class AliyunSmsProvider implements SmsProvider {
    private final SmsService smsService;

    @Override
    public String provider() {
        return "ali_yun";
    }

    @Override
    public boolean send(String phone, String content) {
        // spring-boot-starter-sms exposes HTTP send; in-process send is not required for OTP verify.
        log.debug("AliyunSmsProvider.send is a no-op; use starter /sms/send for delivery");
        return false;
    }

    @Override
    public boolean checkCode(String phone, String code) {
        return smsService.checkSms(phone, code);
    }
}
