package io.github.qifan777.server.user.root.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.infrastructure.security.AdminActionOtpVerifier;
import io.github.qifan777.server.user.root.entity.dto.UserLoginInput;
import io.github.qifan777.server.user.root.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {
    private final UserService userService;
    private final AdminActionOtpVerifier adminActionOtpVerifier;

    @SaIgnore
    @PostMapping("login")
    public SaTokenInfo login(@RequestBody @Validated UserLoginInput loginInput) {
        return userService.loginForAdmin(loginInput);
    }

    /** Invalidate Sa-Token session (clears HttpOnly cookie when cookie auth is enabled). */
    @PostMapping("logout")
    public void logout() {
        if (StpUtil.isLogin()) {
            StpUtil.logout();
        }
    }

    /**
     * Unlock high-risk admin actions for ~5 minutes after OTP/TOTP validation.
     * Subsequent APIs may send {@code x-admin-action-otp: GRANT}.
     */
    @PostMapping("action-grant")
    public Map<String, Object> actionGrant(
            @RequestHeader(value = "x-admin-action-otp", required = false) String otpHeader,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String otp = otpHeader;
        if ((otp == null || otp.isBlank()) && body != null) {
            otp = body.get("otp");
            if (otp == null) {
                otp = body.get("adminActionOtp");
            }
        }
        return adminActionOtpVerifier.issueActionGrant(otp);
    }
}
