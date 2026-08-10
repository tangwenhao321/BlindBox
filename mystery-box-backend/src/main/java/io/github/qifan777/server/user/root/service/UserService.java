package io.github.qifan777.server.user.root.service;

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
import io.github.qifan777.server.infrastructure.model.LoginDevice;
import io.github.qifan777.server.role.entity.Role;
import io.github.qifan777.server.role.repository.RoleRepository;
import io.github.qifan777.server.user.root.entity.dto.UserLoginInput;
import io.github.qifan777.server.user.root.entity.dto.UserRegisterInput;
import io.github.qifan777.server.user.root.entity.dto.UserResetPasswordInput;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.repository.UserRoleRelRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;

@Service
@Slf4j
@AllArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;
    private final AuthSmsOtpGuard authSmsOtpGuard;
    private final RoleRepository roleRepository;
    private final UserRoleRelRepository userRoleRelRepository;
    private final ReferralService referralService;

    @SaIgnore

    public SaTokenInfo register(UserRegisterInput registerInput) {
        authSmsOtpGuard.assertSmsVerified(registerInput.getPhone(), registerInput.getCode());
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
                    .setStatus(DictConstants.UserStatus.NORMAL)
                    .setBalance(BigDecimal.ZERO);
        }));
        StpUtil.login(user.id(), new SaLoginModel()
                .setDevice(LoginDevice.BROWSER)
                .setTimeout(60 * 60 * 24 * 30 * 36));
        Role role = roleRepository.findRoleByName("普通用户").orElseThrow(() -> new BusinessException("角色不存在，清联系管理员"));
        userRoleRelRepository.save(UserRoleRelDraft.$.produce(draft -> {
            draft.setRoleId(role.id())
                    .setUserId(user.id());
        }));
        referralService.bindInviterOnRegister(user.id(), optionalInviteCode(registerInput));
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

    private SaTokenInfo doLogin(UserLoginInput loginInput, boolean requireAdminRole) {
        UserTable userTable = UserTable.$;
        User databaseUser = userRepository.sql().createQuery(userTable)
                .where(userTable.phone().eq(loginInput.getPhone()))
                .select(userTable.fetch(UserRepository.USER_ROLE_FETCHER))
                .fetchOptional()
                .orElseThrow(() -> new BusinessException(AuthErrorCode.USER_LOGIN_NOT_EXIST));
        if (requireAdminRole) {
            boolean isAdmin = databaseUser.rolesView().stream().anyMatch(role -> "管理员".equals(role.name()));
            if (!isAdmin) {
                throw new BusinessException(ResultCode.ParamSetIllegal, "仅管理员账号可登录后台");
            }
        }
        if (databaseUser.password().equals("123456")) {
            throw new BusinessException(AuthErrorCode.USER_PASSWORD_REST);
        }
        if (!BCrypt.checkpw(loginInput.getPassword(), databaseUser.password())) {
            throw new BusinessException(AuthErrorCode.USER_LOGIN_PASSWORD_ERROR);
        }
        StpUtil.login(databaseUser.id(), new SaLoginModel()
                .setDevice(LoginDevice.BROWSER)
                .setTimeout(60 * 60 * 24 * 30 * 36));
        return StpUtil.getTokenInfo();
    }

    public SaTokenInfo passwordRest(UserResetPasswordInput restInput) {
        authSmsOtpGuard.assertSmsVerified(restInput.getPhone(), restInput.getCode());
        User save = userRepository.save(UserDraft.$.produce(restInput.toEntity(), draft -> {
            draft.setPassword(BCrypt.hashpw(draft.password()));
        }));
        StpUtil.login(save.id(), new SaLoginModel()
                .setDevice(LoginDevice.BROWSER)
                .setTimeout(60 * 60 * 24 * 30 * 36));
        return StpUtil.getTokenInfo();
    }


}