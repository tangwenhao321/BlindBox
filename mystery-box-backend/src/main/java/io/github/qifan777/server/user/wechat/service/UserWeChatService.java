package io.github.qifan777.server.user.wechat.service;

import cn.binarywang.wx.miniapp.api.WxMaService;
import cn.binarywang.wx.miniapp.bean.WxMaJscode2SessionResult;
import cn.dev33.satoken.secure.BCrypt;
import cn.dev33.satoken.stp.SaLoginModel;
import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.infrastructure.model.LoginDevice;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.entity.UserFetcher;
import io.github.qifan777.server.user.root.entity.UserTable;
import io.github.qifan777.server.referral.service.ReferralService;
import io.github.qifan777.server.risk.service.RiskControlService;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.github.qifan777.server.user.wechat.entity.UserWeChat;
import io.github.qifan777.server.user.wechat.entity.UserWeChatDraft;
import io.github.qifan777.server.user.wechat.entity.UserWeChatFetcher;
import io.github.qifan777.server.user.wechat.entity.UserWeChatTable;
import io.github.qifan777.server.user.wechat.model.UserWeChatRegisterInput;
import io.github.qifan777.server.user.wechat.model.UserWeChatRegisterInputV2;
import io.github.qifan777.server.user.wechat.repository.UserWeChatRepository;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class UserWeChatService {

    private final UserWeChatRepository userWeChatRepository;
    private final UserRepository userRepository;
    private final WxMaService wxMaService;
    private final ApplicationEventPublisher eventPublisher;
    private final ReferralService referralService;
    private final RiskControlService riskControlService;

    @Value("${sa-token.timeout:2592000}")
    private long saTokenTimeoutSeconds;

    @SneakyThrows
    public SaTokenInfo register(UserWeChatRegisterInput registerInput) {
        return register(registerInput, null);
    }

    @SneakyThrows
    public SaTokenInfo register(UserWeChatRegisterInput registerInput, String deviceId) {
        UserWeChatTable t1 = UserWeChatTable.$;
        WxMaJscode2SessionResult session = wxMaService.getUserService()
                .getSessionInfo(registerInput.getLoginCode());
        String openid = session.getOpenid();
        UserWeChat userWeChat = userWeChatRepository.sql()
                .createQuery(t1)
                .where(t1.openId().eq(openid))
                .select(t1.fetch(UserWeChatFetcher.$.allScalarFields().user(UserFetcher.$.phone())))
                .fetchOptional()
                .orElseGet(() -> {
                    UserTable t2 = UserTable.$;
                    // 查询手机号对应的用户
                    User user = userRepository.sql().createQuery(t2)
                            .where(t2.phone().eq(registerInput.getPhone()))
                            .select(t2)
                            .fetchOptional()
                            // 手机号查询的用户为空,则说明该用户从未使用过起凡商城
                            .orElseGet(() -> {
                                return userRepository.save(UserDraft.$.produce(draft -> {
                                    draft.setNickname("微信用户")
                                            .setPassword(BCrypt.hashpw(IdUtil.fastSimpleUUID()))
                                            .setPhone(registerInput.getPhone());
                                }));
                            });
                    StpUtil.switchTo(user.id());
                    return userWeChatRepository.save(UserWeChatDraft.$.produce(draft -> {
                        draft.setUser(user)
                                .setOpenId(openid);
                    }));
                });
        StpUtil.login(userWeChat.user().id(), new SaLoginModel().setDevice(LoginDevice.MP_WECHAT)
                .setTimeout(saTokenTimeoutSeconds));
        referralService.bindInviterOnRegister(userWeChat.user().id(), registerInput.getInviteCode());
        riskControlService.touchDeviceLink(userWeChat.user().id(), deviceId);
        return StpUtil.getTokenInfo();
    }

    @SneakyThrows
    public SaTokenInfo registerV2(UserWeChatRegisterInputV2 registerInputV2) {
        return registerV2(registerInputV2, null);
    }

    @SneakyThrows
    public SaTokenInfo registerV2(UserWeChatRegisterInputV2 registerInputV2, String deviceId) {
        String phoneNumber = wxMaService.getUserService().getPhoneNoInfo(registerInputV2.getPhoneCode()).getPhoneNumber();
        UserWeChatRegisterInput userWeChatRegisterInput = new UserWeChatRegisterInput();
        userWeChatRegisterInput.setPhone(phoneNumber);
        userWeChatRegisterInput.setInviteCode(registerInputV2.getInviteCode());
        userWeChatRegisterInput.setLoginCode(registerInputV2.getLoginCode());
        return register(userWeChatRegisterInput, deviceId);
    }
}