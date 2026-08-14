package io.github.qifan777.server.user.root.service;

import io.github.qifan777.server.dict.model.UserStatus;

import cn.dev33.satoken.annotation.SaIgnore;
import cn.dev33.satoken.secure.BCrypt;
import cn.dev33.satoken.stp.SaLoginModel;
import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.user.root.entity.*;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import io.qifan.infrastructure.security.AuthErrorCode;
import io.github.qifan777.server.user.auth.AuthSmsOtpGuard;
import io.github.qifan777.server.user.auth.LoginLockoutService;
import io.github.qifan777.server.infrastructure.model.LoginDevice;
import io.github.qifan777.server.role.entity.Role;
import io.github.qifan777.server.role.repository.RoleRepository;
import io.github.qifan777.server.user.root.entity.dto.UserLoginInput;
import io.github.qifan777.server.user.root.entity.dto.UserRegisterInput;
import io.github.qifan777.server.user.root.entity.dto.UserResetPasswordInput;
import io.github.qifan777.server.user.root.entity.dto.UserSmsLoginInput;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.risk.service.RiskControlService;
import io.github.qifan777.server.user.privacy.UserPrivacyService;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.repository.UserRoleRelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.regex.Pattern;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class UserService {
    private static final Pattern PASSWORD_LETTER = Pattern.compile(".*[A-Za-z].*");
    private static final Pattern PASSWORD_DIGIT = Pattern.compile(".*\\d.*");
    /** Uniform client message — do not reveal whether the phone exists. */
    private static final String LOGIN_CREDENTIALS_INVALID = "手机号或密码错误";

    private final UserRepository userRepository;
    private final AuthSmsOtpGuard authSmsOtpGuard;
    private final RoleRepository roleRepository;
    private final UserRoleRelRepository userRoleRelRepository;
    private final ReferralService referralService;
    private final UserPrivacyService userPrivacyService;
    private final RiskControlService riskControlService;
    private final LoginLockoutService loginLockoutService;

    @Value("${sa-token.timeout:2592000}")
    private long saTokenTimeoutSeconds;

    @SaIgnore
    public SaTokenInfo register(UserRegisterInput registerInput) {
        return register(registerInput, null);
    }

    public SaTokenInfo register(UserRegisterInput registerInput, String deviceId) {
        authSmsOtpGuard.assertSmsVerified(registerInput.getPhone(), registerInput.getCode());
        assertPasswordPolicy(registerInput.getPassword());
        UserTable userTable = UserTable.$;
        userRepository.sql().createQuery(userTable)
                .where(userTable.phone().eq(registerInput.getPhone()))
                .select(userTable).fetchOptional()
                .ifPresent((user) -> {
                    throw new BusinessException(ResultCode.StatusHasValid, "用户已经存在");
                });

        User user = userRepository.save(UserDraft.$.produce(registerInput.toEntity(), draft -> {
            draft.setNickname("默认用户")
                    .setPassword(BCrypt.hashpw(draft.password()))
                    .setStatus(UserStatus.NORMAL)
                    .setBalance(BigDecimal.ZERO);
        }));
        StpUtil.login(user.id(), new SaLoginModel()
                .setDevice(LoginDevice.BROWSER)
                .setTimeout(saTokenTimeoutSeconds));
        Role role = roleRepository.findRoleByName("普通用户").orElseThrow(() -> new BusinessException("角色不存在，清联系管理员"));
        userRoleRelRepository.save(UserRoleRelDraft.$.produce(draft -> {
            draft.setRoleId(role.id())
                    .setUserId(user.id());
        }));
        referralService.bindInviterOnRegister(user.id(), optionalInviteCode(registerInput));
        riskControlService.touchDeviceLink(user.id(), deviceId);
        return StpUtil.getTokenInfo();
    }

    /** Jimmer input throws if JSON omits optional {@code inviteCode}; treat as no inviter. */
    private static String optionalInviteCode(UserRegisterInput registerInput) {
        try {
            String code = registerInput.getInviteCode();
            return StringUtils.hasText(code) ? code.trim() : null;
        } catch (IllegalStateException ignored) {
            return null;
        }
    }

    public SaTokenInfo login(UserLoginInput loginInput) {
        return doLogin(loginInput, false);
    }

    public SaTokenInfo loginForAdmin(UserLoginInput loginInput) {
        return doLogin(loginInput, true);
    }

    /** Passwordless SMS login for mobile (parity with Shopee/Lazada OTP tab). */
    public SaTokenInfo loginBySms(UserSmsLoginInput input) {
        String phone = input.phone() == null ? "" : input.phone().trim();
        if (loginLockoutService.isLocked(phone)) {
            throw new BusinessException(ResultCode.StatusHasInvalid, "登录尝试过多，请稍后再试");
        }
        try {
            authSmsOtpGuard.assertSmsVerified(phone, input.code());
        } catch (BusinessException ex) {
            loginLockoutService.recordFailure(phone);
            throw ex;
        }
        User databaseUser = findActiveUserByPhone(phone, false);
        loginLockoutService.clear(phone);
        StpUtil.login(databaseUser.id(), new SaLoginModel()
                .setDevice(LoginDevice.BROWSER)
                .setTimeout(saTokenTimeoutSeconds));
        return StpUtil.getTokenInfo();
    }

    private SaTokenInfo doLogin(UserLoginInput loginInput, boolean requireAdminRole) {
        String phone = loginInput.getPhone() == null ? "" : loginInput.getPhone().trim();
        if (loginLockoutService.isLocked(phone)) {
            throw new BusinessException(ResultCode.StatusHasInvalid, "登录尝试过多，请稍后再试");
        }
        User databaseUser;
        try {
            databaseUser = findActiveUserByPhone(phone, requireAdminRole);
        } catch (BusinessException ex) {
            if (!requireAdminRole) {
                loginLockoutService.recordFailure(phone);
                throw new BusinessException(AuthErrorCode.USER_LOGIN_PASSWORD_ERROR, LOGIN_CREDENTIALS_INVALID);
            }
            throw ex;
        }
        if (databaseUser.password().equals("123456")) {
            throw new BusinessException(AuthErrorCode.USER_PASSWORD_REST);
        }
        if (!BCrypt.checkpw(loginInput.getPassword(), databaseUser.password())) {
            loginLockoutService.recordFailure(phone);
            if (requireAdminRole) {
                throw new BusinessException(AuthErrorCode.USER_LOGIN_PASSWORD_ERROR);
            }
            throw new BusinessException(AuthErrorCode.USER_LOGIN_PASSWORD_ERROR, LOGIN_CREDENTIALS_INVALID);
        }
        loginLockoutService.clear(phone);
        StpUtil.login(databaseUser.id(), new SaLoginModel()
                .setDevice(LoginDevice.BROWSER)
                .setTimeout(saTokenTimeoutSeconds));
        return StpUtil.getTokenInfo();
    }

    private User findActiveUserByPhone(String phone, boolean requireAdminRole) {
        UserTable userTable = UserTable.$;
        User databaseUser = userRepository.sql().createQuery(userTable)
                .where(userTable.phone().eq(phone))
                .select(userTable.fetch(UserRepository.LOGIN_FETCHER))
                .fetchOptional()
                .orElseThrow(() -> new BusinessException(AuthErrorCode.USER_LOGIN_NOT_EXIST));
        if (userPrivacyService.isDeleted(databaseUser.id())
                || UserStatus.BANNED.equals(databaseUser.status())) {
            throw new BusinessException(ResultCode.StatusHasInvalid, "账号已禁用或已注销");
        }
        if (requireAdminRole) {
            boolean isAdmin = databaseUser.rolesView().stream().anyMatch(role -> "管理员".equals(role.name()));
            if (!isAdmin) {
                throw new BusinessException(ResultCode.ParamSetIllegal, "仅管理员账号可登录后台");
            }
        }
        return databaseUser;
    }

    public SaTokenInfo passwordRest(UserResetPasswordInput restInput) {
        authSmsOtpGuard.assertSmsVerified(restInput.getPhone(), restInput.getCode());
        assertPasswordPolicy(restInput.getPassword());
        User save = userRepository.save(UserDraft.$.produce(restInput.toEntity(), draft -> {
            draft.setPassword(BCrypt.hashpw(draft.password()));
        }));
        loginLockoutService.clear(restInput.getPhone());
        StpUtil.login(save.id(), new SaLoginModel()
                .setDevice(LoginDevice.BROWSER)
                .setTimeout(saTokenTimeoutSeconds));
        return StpUtil.getTokenInfo();
    }

    static void assertPasswordPolicy(String password) {
        if (password == null || password.length() < 8
                || !PASSWORD_LETTER.matcher(password).matches()
                || !PASSWORD_DIGIT.matcher(password).matches()) {
            throw new BusinessException(ResultCode.ParamSetIllegal, "密码至少 8 位且需包含字母和数字");
        }
    }

    /**
     * Bind a real phone onto a Zalo-created account that still has a synthetic {@code zalo:} phone.
     */
    public void bindPhone(String userId, String phone, String code) {
        String normalizedPhone = phone == null ? "" : phone.trim();
        authSmsOtpGuard.assertSmsVerified(normalizedPhone, code);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        String current = user.phone();
        if (current == null || !current.startsWith("zalo:")) {
            throw new BusinessException("PHONE_ALREADY_BOUND: 当前账号已绑定手机号");
        }
        UserTable userTable = UserTable.$;
        userRepository.sql().createQuery(userTable)
                .where(userTable.phone().eq(normalizedPhone))
                .select(userTable.id())
                .fetchOptional()
                .ifPresent(existingId -> {
                    if (!existingId.equals(userId)) {
                        throw new BusinessException(ResultCode.StatusHasValid, "该手机号已被其他账号使用");
                    }
                });
        userRepository.update(UserDraft.$.produce(draft -> draft.setId(userId).setPhone(normalizedPhone)));
    }
}
