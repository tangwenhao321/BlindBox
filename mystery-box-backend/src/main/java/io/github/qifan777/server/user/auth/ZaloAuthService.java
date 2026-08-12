package io.github.qifan777.server.user.auth;

import cn.dev33.satoken.stp.SaLoginModel;
import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import cn.dev33.satoken.secure.BCrypt;
import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.infrastructure.model.LoginDevice;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.risk.service.RiskControlService;
import io.github.qifan777.server.role.entity.Role;
import io.github.qifan777.server.role.repository.RoleRepository;
import io.github.qifan777.server.user.privacy.UserPrivacyService;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.entity.UserRoleRelDraft;
import io.github.qifan777.server.user.root.entity.UserTable;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.root.repository.UserRoleRelRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ZaloAuthService {
    private final ZaloOAuthClient zaloOAuthClient;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRelRepository userRoleRelRepository;
    private final UserPrivacyService userPrivacyService;
    private final ReferralService referralService;
    private final RiskControlService riskControlService;

    public SaTokenInfo login(ZaloAuthForFrontController.ZaloLoginRequest request, String deviceId) {
        String accessToken = resolveAccessToken(request);
        ZaloOAuthClient.ZaloProfile profile = zaloOAuthClient.fetchProfile(accessToken);
        String inviteCode = request != null && StringUtils.hasText(request.inviteCode())
                ? request.inviteCode().trim()
                : null;
        User user = findOrCreate(profile, inviteCode);
        if (userPrivacyService.isDeleted(user.id())
                || DictConstants.UserStatus.BANNED.equals(user.status())) {
            throw new BusinessException(ResultCode.StatusHasInvalid, "账号已禁用或已注销");
        }
        StpUtil.login(user.id(), new SaLoginModel()
                .setDevice(LoginDevice.APP_ZALO)
                .setTimeout(60L * 60 * 24 * 30 * 36));
        riskControlService.touchDeviceLink(user.id(), deviceId);
        return StpUtil.getTokenInfo();
    }

    private String resolveAccessToken(ZaloAuthForFrontController.ZaloLoginRequest request) {
        if (request == null) {
            throw new BusinessException("ZALO_LOGIN_INVALID: Request body required");
        }
        if (StringUtils.hasText(request.accessToken())) {
            return request.accessToken().trim();
        }
        if (StringUtils.hasText(request.code())) {
            return zaloOAuthClient.exchangeCodeForAccessToken(request.code(), request.codeVerifier());
        }
        throw new BusinessException("ZALO_LOGIN_INVALID: Provide code or accessToken");
    }

    private User findOrCreate(ZaloOAuthClient.ZaloProfile profile, String inviteCode) {
        UserTable t = UserTable.$;
        return userRepository.sql().createQuery(t)
                .where(t.zaloOpenId().eq(profile.id()))
                .select(t)
                .fetchOptional()
                .map(existing -> refreshProfileIfNeeded(existing, profile))
                .orElseGet(() -> createUser(profile, inviteCode));
    }

    private User refreshProfileIfNeeded(User existing, ZaloOAuthClient.ZaloProfile profile) {
        boolean needNick = !StringUtils.hasText(existing.nickname()) && StringUtils.hasText(profile.name());
        boolean needAvatar = !StringUtils.hasText(existing.avatar()) && StringUtils.hasText(profile.pictureUrl());
        if (!needNick && !needAvatar) {
            return existing;
        }
        return userRepository.save(UserDraft.$.produce(existing, draft -> {
            if (needNick) {
                draft.setNickname(trimTo(profile.name(), 64));
            }
            if (needAvatar) {
                draft.setAvatar(trimTo(profile.pictureUrl(), 512));
            }
        }));
    }

    private User createUser(ZaloOAuthClient.ZaloProfile profile, String inviteCode) {
        String nickname = StringUtils.hasText(profile.name()) ? trimTo(profile.name(), 64) : "Zalo用户";
        User user = userRepository.save(UserDraft.$.produce(draft -> {
            draft.setPhone(syntheticPhone(profile.id()))
                    .setZaloOpenId(profile.id())
                    // Random bcrypt — Zalo accounts must not share the WeChat sentinel "123456".
                    .setPassword(BCrypt.hashpw(IdUtil.fastSimpleUUID()))
                    .setNickname(nickname)
                    .setAvatar(trimTo(profile.pictureUrl(), 512))
                    .setStatus(DictConstants.UserStatus.NORMAL)
                    .setBalance(BigDecimal.ZERO);
        }));
        Role role = roleRepository.findRoleByName("普通用户")
                .orElseThrow(() -> new BusinessException("角色不存在，清联系管理员"));
        userRoleRelRepository.save(UserRoleRelDraft.$.produce(draft -> {
            draft.setRoleId(role.id()).setUserId(user.id());
        }));
        referralService.bindInviterOnRegister(user.id(), inviteCode);
        log.info("Created Zalo user id={} openId={} invite={}", user.id(), profile.id(), inviteCode != null);
        return user;
    }

    /** Stable unique phone placeholder for Jimmer @Key when Zalo has no phone scope. */
    static String syntheticPhone(String zaloOpenId) {
        String candidate = "zalo:" + zaloOpenId;
        if (candidate.length() <= 32) {
            return candidate;
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String hex = HexFormat.of().formatHex(md.digest(zaloOpenId.getBytes(StandardCharsets.UTF_8)));
            return "z" + hex.substring(0, 31);
        } catch (Exception e) {
            return "zalo:" + zaloOpenId.substring(0, Math.min(zaloOpenId.length(), 27));
        }
    }

    private static String trimTo(String value, int max) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String v = value.trim();
        return v.length() <= max ? v : v.substring(0, max);
    }
}
