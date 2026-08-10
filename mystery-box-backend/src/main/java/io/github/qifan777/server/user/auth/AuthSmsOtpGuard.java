package io.github.qifan777.server.user.auth;

import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.qifan.infrastructure.sms.SmsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthSmsOtpGuard {
    private static final String MOCK_OTP = "000000";

    private final SmsService smsService;

    @Value("${app.auth.allow-mock-otp:false}")
    private boolean allowMockOtp;

    public void rejectWeakOtp(String code) {
        if (allowMockOtp) {
            return;
        }
        if (MOCK_OTP.equals(normalize(code))) {
            throw new BusinessException(ResultCode.ValidateError, "验证码错误");
        }
    }

    public void assertSmsVerified(String phone, String code) {
        rejectWeakOtp(code);
        if (allowMockOtp && MOCK_OTP.equals(normalize(code))) {
            return;
        }
        boolean checked = smsService.checkSms(phone, code);
        if (!checked) {
            throw new BusinessException(ResultCode.ValidateError, "验证码错误");
        }
    }

    private static String normalize(String code) {
        return code == null ? "" : code.trim();
    }
}
