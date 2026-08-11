package io.github.qifan777.server.user.root.controller;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.user.root.entity.dto.UserLoginInput;
import io.github.qifan777.server.user.root.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {
    private final UserService userService;

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
}
