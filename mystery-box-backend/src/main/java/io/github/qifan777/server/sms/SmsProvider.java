package io.github.qifan777.server.sms;

/**
 * SMS provider SPI. Config key: {@code sms.provider}
 * ({@code none} | {@code ali_yun} | {@code vn_esms}).
 * Aliyun remains available via spring-boot-starter-sms when {@code sms.provider=ali_yun}.
 */
public interface SmsProvider {

    String provider();

    default boolean isReady() {
        return true;
    }

    default String notReadyReason() {
        return "SMS_PROVIDER_NOT_READY: " + provider();
    }

    /** Send OTP / content. Returns true when accepted by the gateway. */
    boolean send(String phone, String content);

    /** Verify OTP previously sent to phone. */
    boolean checkCode(String phone, String code);
}
