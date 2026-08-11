package io.github.qifan777.server.user.privacy;

import cn.dev33.satoken.secure.BCrypt;
import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.IdUtil;
import io.github.qifan777.server.address.entity.Address;
import io.github.qifan777.server.address.repository.AddressRepository;
import io.github.qifan777.server.dict.model.DictConstants;
import io.github.qifan777.server.user.push.UserPushTokenService;
import io.github.qifan777.server.user.root.entity.User;
import io.github.qifan777.server.user.root.entity.UserDraft;
import io.github.qifan777.server.user.root.repository.UserRepository;
import io.qifan.infrastructure.common.constants.ResultCode;
import io.qifan.infrastructure.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserPrivacyService {
    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final UserPushTokenService userPushTokenService;
    private final JdbcTemplate jdbcTemplate;

    public Map<String, Object> exportPersonalData(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        assertNotDeleted(userId);

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.id());
        profile.put("phone", maskPhone(user.phone()));
        profile.put("nickname", user.nickname());
        profile.put("avatar", user.avatar());
        profile.put("gender", user.gender() == null ? null : user.gender().name());
        profile.put("status", user.status() == null ? null : user.status().name());
        profile.put("balance", user.balance());
        profile.put("luckyCoins", user.luckyCoins());
        profile.put("starStones", user.starStones());
        profile.put("hintCards", user.hintCards());
        profile.put("inviteCode", user.inviteCode());
        profile.put("createdTime", user.createdTime());
        profile.put("editedTime", user.editedTime());

        List<Map<String, Object>> orders = jdbcTemplate.query(
                """
                        SELECT mbo.id AS order_id,
                               mbo.status AS status,
                               mbo.created_time AS created_time,
                               p.pay_amount AS pay_amount,
                               p.pay_time AS pay_time,
                               p.pay_type AS pay_type
                        FROM mystery_box_order mbo
                        LEFT JOIN payment p ON p.id = mbo.id
                        WHERE mbo.creator_id = ?
                        ORDER BY mbo.created_time DESC
                        LIMIT 200
                        """,
                (rs, rowNum) -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("orderId", rs.getString("order_id"));
                    row.put("status", rs.getString("status"));
                    row.put("createdTime", rs.getTimestamp("created_time") == null
                            ? null : rs.getTimestamp("created_time").toLocalDateTime().toString());
                    BigDecimal payAmount = rs.getBigDecimal("pay_amount");
                    row.put("payAmount", payAmount);
                    row.put("payTime", rs.getTimestamp("pay_time") == null
                            ? null : rs.getTimestamp("pay_time").toLocalDateTime().toString());
                    row.put("payType", rs.getString("pay_type"));
                    return row;
                },
                userId
        );

        List<Map<String, Object>> addresses = new ArrayList<>();
        for (Address address : addressRepository.findUserAll(userId)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", address.id());
            row.put("province", address.province());
            row.put("city", address.city());
            row.put("district", address.district());
            row.put("details", address.details());
            row.put("houseNumber", address.houseNumber());
            row.put("realName", address.realName());
            row.put("phoneNumber", maskPhone(address.phoneNumber()));
            row.put("top", address.top());
            addresses.add(row);
        }

        Map<String, Object> dump = new LinkedHashMap<>();
        dump.put("exportedAt", LocalDateTime.now().toString());
        dump.put("profile", profile);
        dump.put("orders", orders);
        dump.put("addresses", addresses);
        return dump;
    }

    @Transactional
    public DeleteRequestResult requestDeletion(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ResultCode.NotFindError, "用户不存在"));
        if (isDeleted(userId)) {
            return new DeleteRequestResult(true, userId, "ACCOUNT_ALREADY_DELETED");
        }

        String anonymizedPhone = anonymizedPhone(userId);
        String randomPassword = BCrypt.hashpw(IdUtil.fastSimpleUUID());
        LocalDateTime now = LocalDateTime.now();

        userRepository.update(UserDraft.$.produce(user, draft -> draft
                .setPhone(anonymizedPhone)
                .setPassword(randomPassword)
                .setNickname("deleted_user")
                .setAvatar(null)
                .setStatus(DictConstants.UserStatus.BANNED)
                .setInviteCode(null)
        ));

        jdbcTemplate.update("UPDATE `user` SET deleted_at = ? WHERE id = ?", now, userId);

        // Clear contact PII on saved addresses (orders keep historical snapshots separately).
        jdbcTemplate.update(
                """
                        UPDATE address
                        SET phone_number = ?,
                            real_name = ?,
                            edited_time = ?
                        WHERE creator_id = ?
                        """,
                "00000000000",
                "DELETED",
                now,
                userId
        );

        // Clear verified identity PII if present (hash kept for anti-fraud, raw name cleared).
        jdbcTemplate.update(
                """
                        UPDATE user_compliance
                        SET real_name = NULL,
                            id_number_masked = NULL,
                            guardian_contact = NULL
                        WHERE user_id = ?
                        """,
                userId
        );

        userPushTokenService.deleteByUserId(userId);

        try {
            StpUtil.kickout(userId);
            StpUtil.disable(userId, 60L * 60 * 24 * 30 * 12 * 10);
            if (StpUtil.isLogin() && userId.equals(StpUtil.getLoginIdAsString())) {
                StpUtil.logout();
            }
        } catch (Exception ignored) {
            // Best-effort session invalidation; DB soft-delete is authoritative.
        }

        return new DeleteRequestResult(true, userId, "ACCOUNT_DELETED");
    }

    public void assertNotDeleted(String userId) {
        if (isDeleted(userId)) {
            throw new BusinessException(ResultCode.StatusHasInvalid, "账号已注销");
        }
    }

    public boolean isDeleted(String userId) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(1) FROM `user` WHERE id = ? AND deleted_at IS NOT NULL",
                Integer.class,
                userId
        );
        return count != null && count > 0;
    }

    private static String anonymizedPhone(String userId) {
        String compact = userId == null ? IdUtil.fastSimpleUUID() : userId.replace("-", "");
        if (compact.length() > 30) {
            compact = compact.substring(0, 30);
        }
        return "d" + compact;
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String value = phone.trim();
        if (value.length() <= 4) {
            return "****";
        }
        if (value.length() <= 7) {
            return value.substring(0, 2) + "****" + value.substring(value.length() - 1);
        }
        return value.substring(0, 3) + "****" + value.substring(value.length() - 4);
    }

    public record DeleteRequestResult(boolean deleted, String userId, String code) {
    }
}
