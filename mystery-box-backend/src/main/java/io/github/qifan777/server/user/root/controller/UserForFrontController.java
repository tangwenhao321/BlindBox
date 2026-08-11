
package io.github.qifan777.server.user.root.controller;

import cn.dev33.satoken.annotation.SaCheckDisable;
import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.github.qifan777.server.menu.entity.Menu;
import io.github.qifan777.server.menu.entity.MenuTable;
import io.github.qifan777.server.menu.repository.MenuRepository;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserBalanceLog;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.entity.dto.UserInfoInput;
import io.github.qifan777.server.user.root.entity.dto.UserLoginInput;
import io.github.qifan777.server.user.root.entity.dto.UserRegisterInput;
import io.github.qifan777.server.user.root.entity.dto.UserResetPasswordInput;
import io.github.qifan777.server.user.root.entity.dto.UserSmsLoginInput;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.repository.UserBalanceLogRepository;
import io.github.qifan777.server.user.root.service.UserService;
import io.github.qifan777.server.user.push.UserPushTokenService;
import io.github.qifan777.server.user.push.dto.PushTokenInput;
import io.github.qifan777.server.user.notification.UserNotificationPrefService;
import io.github.qifan777.server.user.notification.dto.NotificationPrefView;
import lombok.AllArgsConstructor;
import org.babyfish.jimmer.client.FetchBy;
import org.babyfish.jimmer.client.meta.DefaultFetcherOwner;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("front/user")
@AllArgsConstructor
@DefaultFetcherOwner(UserRepository.class)
@Transactional
@SaCheckDisable
public class UserForFrontController {
    private final UserRepository userRepository;
    private final UserBalanceLogRepository userBalanceLogRepository;
    private final MenuRepository menuRepository;
    private final UserService userService;
    private final UserPushTokenService userPushTokenService;
    private final UserNotificationPrefService userNotificationPrefService;

    @GetMapping("info")
    public @FetchBy(value = "USER_ROLE_FETCHER") User getUserInfo() {
        return userRepository.findById(StpUtil.getLoginIdAsString(), UserRepository.USER_ROLE_FETCHER)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "数据不存在"));
    }

    @GetMapping("balance/logs")
    public List<@FetchBy(value = "SIMPLE_FETCHER", ownerType = UserBalanceLogRepository.class) UserBalanceLog> getBalanceLogs(
            @RequestParam(value = "limit", required = false, defaultValue = "20") Integer limit) {
        int safeLimit = limit == null || limit <= 0 ? 20 : Math.min(limit, 100);
        return userBalanceLogRepository.findLatestByUser(StpUtil.getLoginIdAsString(), safeLimit);
    }


    @GetMapping("menus")
    public List<@FetchBy(value = "SIMPLE_FETCHER", ownerType = MenuRepository.class) Menu> getUserMenus() {
        MenuTable t = MenuTable.$;
        return menuRepository.sql()
                .createQuery(t)
                .where(t
                        .roles(roleMenuRelTableEx -> roleMenuRelTableEx
                                .role()
                                .users(userRoleRelTableEx -> userRoleRelTableEx
                                        .user()
                                        .id()
                                        .eq(StpUtil.getLoginIdAsString()))))
                .select(t.fetch(MenuRepository.SIMPLE_FETCHER))
                .execute();
    }

    @SaIgnore
    @PostMapping("register")
    public SaTokenInfo register(@RequestBody @Validated UserRegisterInput registerInput,
                                @RequestHeader(value = "x-device-id", required = false) String deviceId) {
        return userService.register(registerInput, deviceId);
    }

    @SaIgnore
    @PostMapping("login")
    public SaTokenInfo login(@RequestBody @Validated UserLoginInput loginInput) {
        return userService.login(loginInput);
    }

    @SaIgnore
    @PostMapping("login/sms")
    public SaTokenInfo loginBySms(@RequestBody @Validated UserSmsLoginInput loginInput) {
        return userService.loginBySms(loginInput);
    }

    @SaIgnore
    @PutMapping("password")
    public SaTokenInfo passwordRest(@RequestBody @Validated UserResetPasswordInput restInput) {
        return userService.passwordRest(restInput);
    }

    @PostMapping("info")
    public String updateInfo(@RequestBody @Validated UserInfoInput restInput) {
        return userRepository.update(UserDraft.$.produce(restInput.toEntity(), draft -> draft.setId(StpUtil.getLoginIdAsString()))).id();
    }

    @PostMapping("push-token")
    public void registerPushToken(@RequestBody @Validated PushTokenInput input) {
        userPushTokenService.upsert(
                StpUtil.getLoginIdAsString(),
                input.expoPushToken(),
                input.platform(),
                input.releaseChannel()
        );
    }

    /**
     * Prefer deleting by token so logging out one device does not wipe every other device's
     * registration for the same account. Falls back to user-wide delete only when the client
     * cannot supply a token (legacy builds).
     */
    @DeleteMapping("push-token")
    public void unregisterPushToken(@RequestParam(required = false) String expoPushToken) {
        if (expoPushToken != null && !expoPushToken.isBlank()) {
            userPushTokenService.deleteByToken(expoPushToken);
            return;
        }
        userPushTokenService.deleteByUserId(StpUtil.getLoginIdAsString());
    }

    @GetMapping("notification-prefs")
    public NotificationPrefView getNotificationPrefs() {
        return userNotificationPrefService.get(StpUtil.getLoginIdAsString());
    }

    @PutMapping("notification-prefs")
    public NotificationPrefView updateNotificationPrefs(@RequestBody NotificationPrefView body) {
        return userNotificationPrefService.update(StpUtil.getLoginIdAsString(), body);
    }
}
