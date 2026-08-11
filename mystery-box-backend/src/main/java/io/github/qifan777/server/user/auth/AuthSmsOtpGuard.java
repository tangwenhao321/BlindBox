package io.github.qifan777.server.user.auth;

import io.github.qifan777.server.sms.SmsProvider;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.qifan.infrastructure.sms.SmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.regex.Pattern;

@Component
public class AuthSmsOtpGuard {
    private static final String MOCK_OTP = "000000";
    /** E.164 Vietnam mobile: +84 then 9 digits (national number without leading 0). */
    private static final Pattern VN_E164 = Pattern.compile("^\\+84[3-9]\\d{8}$");

    private final SmsService smsService;
    private final Optional<SmsProvider> smsProvider;

    @Value("${app.auth.allow-mock-otp:false}")
    private boolean allowMockOtp;

    public AuthSmsOtpGuard(
            SmsService smsService,
            @Autowired(required = false) SmsProvider smsProvider
    ) {
        this.smsService = smsService;
        this.smsProvider = Optional.ofNullable(smsProvider);
    }

    public void rejectWeakOtp(String code) {
        if (allowMockOtp) {
            return;
        }
        if (MOCK_OTP.equals(normalize(code))) {
            throw new BusinessException(ResultCode.ValidateError, "验证码错误");
        }
    }

    public void assertSmsVerified(String phone, String code) {
        assertPhoneFormat(phone);
        rejectWeakOtp(code);
        if (allowMockOtp && MOCK_OTP.equals(normalize(code))) {
            return;
        }
        // Prefer Redis OTP from SmsService.sendSms (front /front/auth/sms/send).
        // Provider.checkCode is a secondary path once Partner OTP APIs exist.
        boolean checked = smsService.checkSms(phone, code);
        if (!checked) {
            checked = smsProvider
                    .filter(SmsProvider::isReady)
                    .map(p -> p.checkCode(phone, code))
                    .orElse(false);
        }
        if (!checked) {
            throw new BusinessException(ResultCode.ValidateError, "验证码错误");
        }
    }

    /**
     * Basic E.164 check for Vietnam (+84). Other markets keep existing free-form phone strings.
     */
    public void assertPhoneFormat(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new BusinessException(ResultCode.ValidateError, "手机号不能为空");
        }
        String value = phone.trim();
        if (value.startsWith("+84") || value.startsWith("84")) {
            String e164 = value.startsWith("+") ? value : "+" + value;
            if (!VN_E164.matcher(e164).matches()) {
                throw new BusinessException(ResultCode.ValidateError, "手机号格式错误（需 E.164 +84）");
            }
        }
    }

    private static String normalize(String code) {
        return code == null ? "" : code.trim();
    }
}
